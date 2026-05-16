#pragma once

#include "minis3/config.hpp"
#include "minis3/object_store.hpp"
#include "minis3/thread_pool.hpp"
#include <atomic>
#include <string>
#include <thread>
#include <openssl/ssl.h>

namespace minis3 {

class Server {
public:
    explicit Server(const Config& config);
    ~Server();

    void start();
    void stop();

    ObjectStore& store() { return object_store_; }
    std::atomic<uint64_t>& request_count() { return request_count_; }

private:
    void accept_loop();
    void handle_request(int client_fd, SSL* ssl);
    bool read_request(int client_fd, SSL* ssl, std::string& request);
    void send_response(int client_fd, SSL* ssl, const HttpResponse& resp);
    void send_file(int client_fd, SSL* ssl, const HttpResponse& resp);

    Config config_;
    int server_fd_;
    SSL_CTX* ssl_ctx_;
    ThreadPool thread_pool_;
    ObjectStore object_store_;
    std::atomic<bool> running_;
    std::atomic<uint64_t> request_count_;
    std::thread accept_thread_;
};

}
