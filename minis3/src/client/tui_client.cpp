// minis3cli — terminal client for MiniS3
// Usage: minis3cli [-h host] [-p port]

#include "minis3/tui_backend.hpp"

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <fstream>
#include <cstdio>
#include <cstring>
#include <stdexcept>
#include <algorithm>

#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>

// ── HTTP client ───────────────────────────────────────────────────────────────

struct HttpResult {
    int status_code = 0;
    std::string status_message;
    std::map<std::string, std::string> headers;
    std::string body;
};

static int connect_to(const std::string& host, int port) {
    struct addrinfo hints{}, *res = nullptr;
    hints.ai_family   = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    if (getaddrinfo(host.c_str(), std::to_string(port).c_str(), &hints, &res) != 0)
        return -1;
    int fd = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (fd < 0) { freeaddrinfo(res); return -1; }
    if (connect(fd, res->ai_addr, res->ai_addrlen) != 0) {
        close(fd); freeaddrinfo(res); return -1;
    }
    freeaddrinfo(res);
    return fd;
}

static void send_all(int fd, const char* buf, size_t len) {
    while (len > 0) {
        ssize_t n = send(fd, buf, len, 0);
        if (n <= 0) throw std::runtime_error("send failed");
        buf += n; len -= n;
    }
}

static std::string read_until_headers_end(int fd) {
    std::string buf;
    char c;
    while (true) {
        ssize_t n = recv(fd, &c, 1, 0);
        if (n <= 0) break;
        buf += c;
        if (buf.size() >= 4 && buf.compare(buf.size() - 4, 4, "\r\n\r\n") == 0)
            break;
    }
    return buf;
}

static HttpResult do_request(const std::string& host, int port,
                              const std::string& method, const std::string& path,
                              const std::string& body = "") {
    int fd = connect_to(host, port);
    if (fd < 0) throw std::runtime_error("Cannot connect to " + host + ":" + std::to_string(port));

    std::ostringstream req;
    req << method << " " << path << " HTTP/1.0\r\n";
    req << "Host: " << host << "\r\n";
    if (!body.empty()) req << "Content-Length: " << body.size() << "\r\n";
    req << "\r\n" << body;

    std::string r = req.str();
    send_all(fd, r.data(), r.size());

    std::string header_raw = read_until_headers_end(fd);
    HttpResult result;

    std::istringstream ss(header_raw);
    std::string http_ver;
    ss >> http_ver >> result.status_code;
    std::getline(ss, result.status_message);
    while (!result.status_message.empty() &&
           (result.status_message.front() == ' ' || result.status_message.back() == '\r'))
        result.status_message.erase(result.status_message.begin());

    std::string line;
    while (std::getline(ss, line) && line != "\r") {
        size_t colon = line.find(':');
        if (colon == std::string::npos) continue;
        std::string k = line.substr(0, colon);
        std::string v = line.substr(colon + 1);
        while (!v.empty() && v.front() == ' ') v.erase(v.begin());
        while (!v.empty() && (v.back() == '\r' || v.back() == '\n')) v.pop_back();
        std::transform(k.begin(), k.end(), k.begin(), ::tolower);
        result.headers[k] = v;
    }

    size_t content_length = 0;
    auto it = result.headers.find("content-length");
    if (it != result.headers.end()) {
        try { content_length = std::stoul(it->second); } catch (...) {}
    }

    if (content_length > 0) {
        result.body.resize(content_length, '\0');
        size_t received = 0;
        while (received < content_length) {
            ssize_t n = recv(fd, &result.body[received], content_length - received, 0);
            if (n <= 0) break;
            received += n;
        }
        result.body.resize(received);
    } else {
        char buf[4096];
        ssize_t n;
        while ((n = recv(fd, buf, sizeof(buf), 0)) > 0)
            result.body.append(buf, n);
    }

    close(fd);
    return result;
}

// Streams a GET response body directly to a file (avoids buffering in memory).
static bool download_to_file(const std::string& host, int port,
                               const std::string& path, const std::string& dest) {
    int fd = connect_to(host, port);
    if (fd < 0) return false;

    std::ostringstream req;
    req << "GET " << path << " HTTP/1.0\r\nHost: " << host << "\r\n\r\n";
    std::string r = req.str();
    send_all(fd, r.data(), r.size());

    std::string header_raw = read_until_headers_end(fd);
    int status = 0;
    std::istringstream ss(header_raw);
    std::string ver; ss >> ver >> status;
    if (status != 200) { close(fd); return false; }

    std::ofstream out(dest, std::ios::binary | std::ios::trunc);
    if (!out) { close(fd); return false; }

    char buf[65536];
    ssize_t n;
    while ((n = recv(fd, buf, sizeof(buf), 0)) > 0)
        out.write(buf, n);

    close(fd);
    return true;
}

// ── HTTP backend ─────────────────────────────────────────────────────────────

class HttpBackend : public minis3::TUIBackend {
public:
    HttpBackend(std::string host, int port) : host_(std::move(host)), port_(port) {}

    std::vector<std::string> list_buckets() override {
        try {
            auto res = do_request(host_, port_, "GET", "/");
            if (res.status_code == 200)
                return minis3::tui_utils::xml_values(res.body, "Name");
        } catch (...) {}
        return {};
    }

    std::vector<std::pair<std::string, size_t>> list_objects(const std::string& bucket) override {
        std::vector<std::pair<std::string, size_t>> objs;
        try {
            auto res = do_request(host_, port_, "GET", "/" + bucket);
            if (res.status_code == 200) {
                auto keys  = minis3::tui_utils::xml_values(res.body, "Key");
                auto sizes = minis3::tui_utils::xml_values(res.body, "Size");
                for (size_t i = 0; i < keys.size(); ++i) {
                    size_t sz = (i < sizes.size()) ? std::stoul(sizes[i]) : 0;
                    objs.emplace_back(keys[i], sz);
                }
            }
        } catch (...) {}
        return objs;
    }

    std::string create_bucket(const std::string& name) override {
        try {
            auto res = do_request(host_, port_, "PUT", "/" + name);
            return res.status_code == 200 ? ""
                : std::to_string(res.status_code) + " " + res.status_message;
        } catch (std::exception& e) { return e.what(); }
    }

    std::string delete_bucket(const std::string& name) override {
        try {
            auto res = do_request(host_, port_, "DELETE", "/" + name);
            return (res.status_code == 200 || res.status_code == 204) ? ""
                : std::to_string(res.status_code) + " " + res.status_message;
        } catch (std::exception& e) { return e.what(); }
    }

    std::string put_object(const std::string& bucket, const std::string& key,
                            const std::string& body) override {
        try {
            auto res = do_request(host_, port_, "PUT", "/" + bucket + "/" + key, body);
            return res.status_code == 200 ? ""
                : std::to_string(res.status_code) + " " + res.status_message;
        } catch (std::exception& e) { return e.what(); }
    }

    std::string delete_object(const std::string& bucket, const std::string& key) override {
        try {
            auto res = do_request(host_, port_, "DELETE", "/" + bucket + "/" + key);
            return (res.status_code == 200 || res.status_code == 204) ? ""
                : std::to_string(res.status_code) + " " + res.status_message;
        } catch (std::exception& e) { return e.what(); }
    }

    bool download_object(const std::string& bucket, const std::string& key,
                         const std::string& dest) override {
        return download_to_file(host_, port_, "/" + bucket + "/" + key, dest);
    }

private:
    std::string host_;
    int port_;
};

// ── Entry point ───────────────────────────────────────────────────────────────

static void print_usage(const char* prog) {
    std::cout << "Usage: " << prog << " [options]\n"
              << "Options:\n"
              << "  -h, --host <host>   Server host (default: localhost)\n"
              << "  -p, --port <port>   Server port (default: 8080)\n"
              << "  --help              Show this help\n";
}

int main(int argc, char* argv[]) {
    std::string host = "localhost";
    int port = 8080;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--help") { print_usage(argv[0]); return 0; }
        else if ((arg == "-h" || arg == "--host") && i + 1 < argc) host = argv[++i];
        else if ((arg == "-p" || arg == "--port") && i + 1 < argc) port = std::stoi(argv[++i]);
    }

    int fd = connect_to(host, port);
    if (fd < 0) {
        std::cerr << "Cannot connect to " << host << ":" << port
                  << " — is the server running?\n";
        return 1;
    }
    close(fd);

    HttpBackend backend(host, port);
    minis3::run_main_menu(backend, "MiniS3 Client Console  [" + host + ":" + std::to_string(port) + "]");
    return 0;
}
