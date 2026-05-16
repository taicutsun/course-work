#pragma once

#include <string>
#include <chrono>
#include <mutex>
#include <iostream>
#include <sstream>
#include <iomanip>

namespace minis3 {

enum class LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR
};

class Logger {
public:
    static Logger& instance() {
        static Logger instance;
        return instance;
    }

    void set_level(LogLevel level) {
        std::lock_guard<std::mutex> lock(mutex_);
        level_ = level;
    }

    void set_verbose(bool verbose) {
        std::lock_guard<std::mutex> lock(mutex_);
        verbose_ = verbose;
    }

    void debug(const std::string& msg) { log(LogLevel::DEBUG, msg); }
    void info(const std::string& msg) { log(LogLevel::INFO, msg); }
    void warn(const std::string& msg) { log(LogLevel::WARN, msg); }
    void error(const std::string& msg) { log(LogLevel::ERROR, msg); }

    template<typename... Args>
    void log(LogLevel level, Args&&... args) {
        if (level < level_) return;
        if (level == LogLevel::DEBUG && !verbose_) return;

        std::lock_guard<std::mutex> lock(mutex_);
        std::ostringstream oss;
        oss << "[" << timestamp() << "] " << level_str(level) << ": ";
        ((oss << std::forward<Args>(args)), ...);
        std::cout << oss.str() << std::endl;
    }

private:
    Logger() = default;
    
    std::string timestamp() {
        auto now = std::chrono::system_clock::now();
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()) % 1000;
        auto timer = std::chrono::system_clock::to_time_t(now);
        std::tm bt = *std::localtime(&timer);
        char buf[32];
        std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &bt);
        std::ostringstream oss;
        oss << buf << '.' << std::setfill('0') << std::setw(3) << ms.count();
        return oss.str();
    }

    const char* level_str(LogLevel level) {
        switch (level) {
            case LogLevel::DEBUG: return "DEBUG";
            case LogLevel::INFO:  return "INFO ";
            case LogLevel::WARN:  return "WARN ";
            case LogLevel::ERROR: return "ERROR";
        }
        return "UNKNOWN";
    }

    LogLevel level_ = LogLevel::INFO;
    bool verbose_ = false;
    std::mutex mutex_;
};

#define LOG_DEBUG(...) minis3::Logger::instance().log(minis3::LogLevel::DEBUG, __VA_ARGS__)
#define LOG_INFO(...)  minis3::Logger::instance().log(minis3::LogLevel::INFO, __VA_ARGS__)
#define LOG_WARN(...)  minis3::Logger::instance().log(minis3::LogLevel::WARN, __VA_ARGS__)
#define LOG_ERROR(...) minis3::Logger::instance().log(minis3::LogLevel::ERROR, __VA_ARGS__)

}
