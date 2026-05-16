#include "minis3/tls.hpp"
#include "minis3/logger.hpp"
#include <openssl/err.h>
#include <filesystem>
#include <cstdlib>

namespace minis3 {

SSL_CTX* create_ssl_context() {
    SSL_library_init();
    SSL_load_error_strings();
    OpenSSL_add_all_algorithms();

    SSL_CTX* ctx = SSL_CTX_new(TLS_server_method());
    if (!ctx) {
        LOG_ERROR("Failed to create SSL context");
        return nullptr;
    }

    SSL_CTX_set_min_proto_version(ctx, TLS1_2_VERSION);
    return ctx;
}

static bool load_cert_files(SSL_CTX* ctx, const Config& config) {
    if (SSL_CTX_use_certificate_file(ctx, config.cert_file.c_str(), SSL_FILETYPE_PEM) <= 0) {
        LOG_ERROR("Failed to load certificate");
        return false;
    }
    if (SSL_CTX_use_PrivateKey_file(ctx, config.key_file.c_str(), SSL_FILETYPE_PEM) <= 0) {
        LOG_ERROR("Failed to load private key");
        return false;
    }
    return true;
}

bool load_or_generate_cert(SSL_CTX* ctx, const Config& config) {
    std::filesystem::create_directories(config.storage_dir);

    if (std::filesystem::exists(config.cert_file) && std::filesystem::exists(config.key_file)) {
        if (!load_cert_files(ctx, config)) return false;
        LOG_INFO("Using existing TLS certificate");
        return true;
    }

    LOG_INFO("Generating self-signed TLS certificate...");

    std::string cmd = "openssl req -x509 -newkey rsa:4096 -keyout " + config.key_file +
                      " -out " + config.cert_file +
                      " -days 365 -nodes -subj '/CN=localhost' 2>/dev/null";

    if (std::system(cmd.c_str()) != 0) {
        LOG_ERROR("Failed to generate certificate with openssl");
        return false;
    }

    if (!load_cert_files(ctx, config)) return false;

    LOG_INFO("TLS certificate generated successfully");
    return true;
}

}
