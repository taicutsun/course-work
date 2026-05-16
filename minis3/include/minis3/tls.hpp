#pragma once

#include "minis3/config.hpp"
#include <openssl/ssl.h>

namespace minis3 {

SSL_CTX* create_ssl_context();
bool load_or_generate_cert(SSL_CTX* ctx, const Config& config);

}
