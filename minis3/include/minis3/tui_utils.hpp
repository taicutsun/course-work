#pragma once

#include <iostream>
#include <string>
#include <vector>
#include <cstdio>

namespace minis3 {
namespace tui_utils {

constexpr int kWidth = 52;

inline void clear_screen() {
    std::cout << "\033[2J\033[H" << std::flush;
}

inline void print_header(const std::string& title) {
    std::string bar(kWidth, '=');
    std::cout << "\n+" << bar << "+\n";
    int pad = (kWidth - static_cast<int>(title.size())) / 2;
    if (pad < 1) pad = 1;
    int rpad = kWidth - pad - static_cast<int>(title.size());
    if (rpad < 1) rpad = 1;
    std::cout << "|" << std::string(pad, ' ') << title << std::string(rpad, ' ') << "|\n";
    std::cout << "+" << bar << "+\n\n";
}

inline void print_divider() {
    std::cout << "  " << std::string(kWidth - 2, '-') << "\n";
}

inline std::string prompt(const std::string& text) {
    std::cout << "  " << text;
    std::string line;
    std::getline(std::cin, line);
    while (!line.empty() && (line.back() == '\r' || line.back() == '\n'))
        line.pop_back();
    return line;
}

inline std::string format_size(size_t bytes) {
    const char* units[] = {"B", "KB", "MB", "GB", "TB"};
    double v = static_cast<double>(bytes);
    int u = 0;
    while (v >= 1024.0 && u < 4) { v /= 1024.0; ++u; }
    char buf[32];
    if (u == 0) snprintf(buf, sizeof(buf), "%zu B", bytes);
    else        snprintf(buf, sizeof(buf), "%.1f %s", v, units[u]);
    return buf;
}

inline std::vector<std::string> xml_values(const std::string& xml, const std::string& tag) {
    std::vector<std::string> out;
    std::string open  = "<" + tag + ">";
    std::string close = "</" + tag + ">";
    size_t pos = 0;
    while ((pos = xml.find(open, pos)) != std::string::npos) {
        pos += open.size();
        size_t end = xml.find(close, pos);
        if (end == std::string::npos) break;
        out.push_back(xml.substr(pos, end - pos));
        pos = end + close.size();
    }
    return out;
}

} // namespace tui_utils
} // namespace minis3
