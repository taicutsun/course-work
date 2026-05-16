#include "minis3/config.hpp"
#include "minis3/logger.hpp"
#include "minis3/server.hpp"
#include "minis3/tui.hpp"
#include <iostream>
#include <csignal>
#include <thread>

namespace {

std::unique_ptr<minis3::Server> g_server;

void signal_handler(int signal) {
    std::cout << "\nReceived signal " << signal << ", shutting down...\n";
    if (g_server) {
        g_server->stop();
    }
}

} // namespace

int main(int argc, char* argv[]) try {
    auto config = minis3::parse_args(argc, argv);
    
    minis3::Logger::instance().set_verbose(config.verbose);
    minis3::Logger::instance().set_level(
        config.verbose ? minis3::LogLevel::DEBUG : minis3::LogLevel::INFO);
    
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);
    
    g_server = std::make_unique<minis3::Server>(config);
    g_server->start();

    if (config.interactive) {
        minis3::ServerTUI tui(g_server->store(), config, g_server->request_count());
        tui.run();
        g_server->stop();
        g_server.reset();   // destroy server now, while Logger is still alive
    } else {
        while (true) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }

    return 0;
    
} catch (const std::exception& e) {
    std::cerr << "Fatal error: " << e.what() << std::endl;
    return 1;
}
