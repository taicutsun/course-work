#include "minis3/server.hpp"
#include "minis3/logger.hpp"
#include "minis3/tls.hpp"
#include "minis3/ui.hpp"

#include <sys/socket.h>
#include <netinet/in.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/select.h>
#include <errno.h>
#include <cstring>

namespace minis3 {

namespace {

constexpr int kBacklog = 10;
constexpr int kIoTimeoutSec = 5;
constexpr size_t kReadBufSize = 4096;
constexpr size_t kBodyBufSize = 8192;
constexpr size_t kFileBufSize = 65536;

ssize_t recv_some(int fd, SSL* ssl, char* buf, size_t len) {
    return ssl ? SSL_read(ssl, buf, static_cast<int>(len))
               : recv(fd, buf, len, 0);
}

ssize_t send_some(int fd, SSL* ssl, const char* buf, size_t len) {
    return ssl ? SSL_write(ssl, buf, static_cast<int>(len))
               : send(fd, buf, len, 0);
}

bool wait_readable(int fd) {
    fd_set read_fds;
    FD_ZERO(&read_fds);
    FD_SET(fd, &read_fds);
    timeval tv{kIoTimeoutSec, 0};
    return select(fd + 1, &read_fds, nullptr, nullptr, &tv) > 0;
}

void close_conn(int client_fd, SSL* ssl) {
    if (ssl) SSL_free(ssl);
    close(client_fd);
}

} // namespace

Server::Server(const Config& config)
    : config_(config)
    , server_fd_(-1)
    , ssl_ctx_(nullptr)
    , thread_pool_(config.thread_count)
    , object_store_(config)
    , running_(false)
    , request_count_(0)
{
    object_store_.set_buffer_size(config.buffer_size);
}

Server::~Server() {
    stop();
    if (ssl_ctx_) {
        SSL_CTX_free(ssl_ctx_);
        ssl_ctx_ = nullptr;
    }
}

void Server::start() {
    if (config_.use_tls) {
        ssl_ctx_ = create_ssl_context();
        if (!ssl_ctx_ || !load_or_generate_cert(ssl_ctx_, config_)) {
            LOG_ERROR("Failed to initialize TLS");
            if (ssl_ctx_) { SSL_CTX_free(ssl_ctx_); ssl_ctx_ = nullptr; }
            return;
        }
    }

    server_fd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd_ < 0) {
        LOG_ERROR("Failed to create socket: ", strerror(errno));
        return;
    }

    int opt = 1;
    setsockopt(server_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(config_.port);

    if (bind(server_fd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        LOG_ERROR("Failed to bind: ", strerror(errno));
        close(server_fd_);
        return;
    }

    if (listen(server_fd_, kBacklog) < 0) {
        LOG_ERROR("Failed to listen: ", strerror(errno));
        close(server_fd_);
        return;
    }

    running_ = true;

    LOG_INFO(config_.use_tls ? "HTTPS" : "HTTP",
             " server started on port ", config_.port);
    LOG_INFO("Storage directory: ", config_.storage_dir.string());
    LOG_INFO("Buffer size: ", config_.buffer_size);
    LOG_INFO("Thread count: ", config_.thread_count);

    accept_thread_ = std::thread(&Server::accept_loop, this);
}

void Server::accept_loop() {
    while (running_) {
        int client_fd = accept(server_fd_, nullptr, nullptr);
        if (client_fd < 0) continue;

        SSL* ssl = nullptr;
        if (config_.use_tls && ssl_ctx_) {
            ssl = SSL_new(ssl_ctx_);
            SSL_set_fd(ssl, client_fd);
            if (SSL_accept(ssl) <= 0) {
                LOG_ERROR("TLS handshake failed");
                SSL_free(ssl);
                close(client_fd);
                continue;
            }
        }

        ++request_count_;
        handle_request(client_fd, ssl);
    }
}

void Server::stop() {
    if (!running_) return;
    running_ = false;
    if (server_fd_ >= 0) {
        close(server_fd_);
        server_fd_ = -1;
    }
    if (accept_thread_.joinable()) accept_thread_.join();
    LOG_INFO("Server stopped. Total requests: ", request_count_.load());
}

bool Server::read_request(int client_fd, SSL* ssl, std::string& request) {
    request.clear();
    char buffer[kReadBufSize];

    while (running_) {
        if (!wait_readable(client_fd)) return false;

        ssize_t n = recv_some(client_fd, ssl, buffer, sizeof(buffer) - 1);
        if (n <= 0) return false;

        request.append(buffer, n);
        if (request.find("\r\n\r\n") != std::string::npos) return true;
    }

    return false;
}

void Server::handle_request(int client_fd, SSL* ssl) {
    std::string request;
    if (!read_request(client_fd, ssl, request)) {
        close_conn(client_fd, ssl);
        return;
    }

    auto parsed = HttpParser::parse(request);
    if (!parsed) {
        auto err = HttpParser::make_error_response(400, "Bad Request");
        std::string s = HttpParser::serialize_response(err);
        send_some(client_fd, ssl, s.data(), s.size());
        close_conn(client_fd, ssl);
        return;
    }

    HttpRequest req = std::move(*parsed);
    size_t content_length = req.content_length.value_or(0);

    while (req.body.size() < content_length) {
        if (!wait_readable(client_fd)) break;
        char buf[kBodyBufSize];
        ssize_t n = recv_some(client_fd, ssl, buf, sizeof(buf));
        if (n <= 0) break;
        req.body.append(buf, n);
    }

    HttpResponse resp;

    if (req.method == HttpMethod::OPTIONS) {
        resp = HttpParser::make_response(200, "OK");
    } else if (req.method == HttpMethod::GET && req.path == "_ui") {
        resp = serve_ui();
    } else if (req.method == HttpMethod::PUT) {
        resp = req.key.empty() ? object_store_.handle_create_bucket(req)
                               : object_store_.handle_put(req);
    } else if (req.method == HttpMethod::GET) {
        if (req.list_buckets) {
            resp = object_store_.handle_list_buckets(req);
        } else if (req.bucket.empty()) {
            resp = HttpParser::make_error_response(400, "Bad Request");
        } else if (req.key.empty()) {
            req.list_objects = true;
            resp = object_store_.handle_list_objects(req);
        } else {
            resp = object_store_.handle_get(req);
        }
    } else if (req.method == HttpMethod::DELETE) {
        resp = req.key.empty() ? object_store_.handle_delete_bucket(req)
                               : object_store_.handle_delete(req);
    } else {
        resp = HttpParser::make_error_response(405, "Method Not Allowed");
    }

    send_response(client_fd, ssl, resp);
}

void Server::send_response(int client_fd, SSL* ssl, const HttpResponse& resp) {
    if (!resp.filepath.empty() && resp.body_size > 0) {
        send_file(client_fd, ssl, resp);
        return;
    }

    std::string resp_str = HttpParser::serialize_response(resp);
    send_some(client_fd, ssl, resp_str.data(), resp_str.size());
    close_conn(client_fd, ssl);
}

void Server::send_file(int client_fd, SSL* ssl, const HttpResponse& resp) {
    int fd = open(resp.filepath.c_str(), O_RDONLY);
    if (fd < 0) {
        auto err = HttpParser::make_error_response(500, "Internal Server Error");
        std::string s = HttpParser::serialize_response(err);
        send_some(client_fd, ssl, s.data(), s.size());
        close_conn(client_fd, ssl);
        return;
    }

    std::string header_str = HttpParser::serialize_response(resp);
    send_some(client_fd, ssl, header_str.data(), header_str.size());

    char buffer[kFileBufSize];
    ssize_t n;
    while ((n = read(fd, buffer, sizeof(buffer))) > 0) {
        send_some(client_fd, ssl, buffer, n);
    }

    close(fd);
    close_conn(client_fd, ssl);
}

}
