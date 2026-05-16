#include "minis3/config.hpp"
#include <iostream>
#include <cstring>

namespace minis3 {

namespace {

void print_usage(const char* prog) {
    std::cout << "Usage: " << prog << " [options]\n"
              << "Options:\n"
              << "  -p, --port <port>       Server port (default: 8080)\n"
              << "  -d, --dir <path>        Storage directory (default: ./storage)\n"
              << "  -b, --buffer <size>     Buffer size in bytes (default: 65536)\n"
              << "  -t, --threads <count>   Number of worker threads (default: 4)\n"
              << "  -v, --verbose           Enable verbose logging\n"
              << "  -T, --tls               Enable TLS/HTTPS (auto-generates self-signed cert)\n"
              << "  -i, --interactive       Launch terminal console after server starts\n"
              << "  -h, --help              Show this help message\n";
}

bool is_flag(const char* arg, const char* short_flag, const char* long_flag) {
    return strcmp(arg, short_flag) == 0 || strcmp(arg, long_flag) == 0;
}

} // namespace

Config parse_args(int argc, char* argv[]) {
    Config cfg;
    
    for (int i = 1; i < argc; ++i) {
        if (is_flag(argv[i], "-h", "--help")) {
            print_usage(argv[0]);
            std::exit(0);
        } else if (is_flag(argv[i], "-p", "--port")) {
            if (i + 1 < argc) cfg.port = static_cast<uint16_t>(std::stoi(argv[++i]));
        } else if (is_flag(argv[i], "-d", "--dir")) {
            if (i + 1 < argc) cfg.storage_dir = argv[++i];
        } else if (is_flag(argv[i], "-b", "--buffer")) {
            if (i + 1 < argc) cfg.buffer_size = std::stoul(argv[++i]);
        } else if (is_flag(argv[i], "-t", "--threads")) {
            if (i + 1 < argc) cfg.thread_count = std::stoul(argv[++i]);
        } else if (is_flag(argv[i], "-v", "--verbose")) {
            cfg.verbose = true;
        } else if (is_flag(argv[i], "-T", "--tls")) {
            cfg.use_tls = true;
        } else if (is_flag(argv[i], "-i", "--interactive")) {
            cfg.interactive = true;
        }
    }
    
    if (cfg.use_tls) {
        cfg.cert_file = (cfg.storage_dir / "cert.pem").string();
        cfg.key_file = (cfg.storage_dir / "key.pem").string();
    }
    
    return cfg;
}

}
