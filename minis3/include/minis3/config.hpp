#pragma once

#include <cstdint>
#include <string>
#include <filesystem>

namespace minis3 {

struct Config {
    uint16_t port = 8080;
    std::filesystem::path storage_dir = "./storage";
    size_t buffer_size = 65536;
    size_t thread_count = 4;
    bool verbose = false;
    bool use_tls = false;
    bool interactive = false;
    std::string cert_file;
    std::string key_file;
};

Config parse_args(int argc, char* argv[]);

}
