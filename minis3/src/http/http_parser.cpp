#include "minis3/http_parser.hpp"
#include "minis3/logger.hpp"
#include <algorithm>
#include <sstream>

namespace minis3 {

std::string_view HttpParser::trim(std::string_view sv) {
    while (!sv.empty() && std::isspace(sv.front())) sv.remove_prefix(1);
    while (!sv.empty() && std::isspace(sv.back())) sv.remove_suffix(1);
    return sv;
}

HttpMethod HttpParser::parse_method(std::string_view method) {
    if (method == "GET") return HttpMethod::GET;
    if (method == "PUT") return HttpMethod::PUT;
    if (method == "DELETE") return HttpMethod::DELETE;
    if (method == "HEAD") return HttpMethod::HEAD;
    if (method == "POST") return HttpMethod::POST;
    if (method == "OPTIONS") return HttpMethod::OPTIONS;
    return HttpMethod::UNKNOWN;
}

std::optional<HttpRequest> HttpParser::parse(std::string_view data) {
    HttpRequest req;
    
    size_t header_end = data.find("\r\n\r\n");
    if (header_end == std::string_view::npos) {
        header_end = data.size();
    }
    
    std::string header_str(std::string(data.substr(0, header_end)));
    std::istringstream stream(header_str);
    std::string line;
    
    if (!std::getline(stream, line)) {
        return std::nullopt;
    }
    
    std::istringstream request_line(line);
    std::string method_str, path_str, http_version;
    request_line >> method_str >> path_str >> http_version;
    
    req.method = parse_method(method_str);
    if (req.method == HttpMethod::UNKNOWN) {
        LOG_DEBUG("Unknown method: ", method_str);
        return std::nullopt;
    }
    
    size_t query_pos = path_str.find('?');
    if (query_pos != std::string::npos) {
        req.path = path_str.substr(0, query_pos);
        req.query = path_str.substr(query_pos + 1);
    } else {
        req.path = path_str;
    }
    
    while (std::getline(stream, line)) {
        if (line == "\r" || line.empty()) break;
        
        size_t colon_pos = line.find(':');
        if (colon_pos != std::string::npos) {
            std::string key = std::string(trim(line.substr(0, colon_pos)));
            std::string value = std::string(trim(line.substr(colon_pos + 1)));
            
            std::transform(key.begin(), key.end(), key.begin(), 
                [](unsigned char c) { return std::tolower(c); });
            
            req.headers[key] = value;
            
            if (key == "content-length") {
                try {
                    req.content_length = std::stoull(value);
                } catch (...) {}
            } else if (key == "content-md5") {
                req.content_md5 = value;
            } else if (key == "range") {
                if (value.substr(0, 6) == "bytes=") {
                    std::string range_spec = value.substr(6);
                    size_t dash_pos = range_spec.find('-');
                    if (dash_pos != std::string::npos) {
                        uint64_t start = 0, end = 0;
                        if (dash_pos > 0) {
                            start = std::stoull(range_spec.substr(0, dash_pos));
                        }
                        if (dash_pos < range_spec.size() - 1) {
                            end = std::stoull(range_spec.substr(dash_pos + 1));
                        }
                        req.range = {start, end};
                    }
                }
            }
        }
    }
    
    if (header_end != std::string_view::npos && header_end + 4 < data.size()) {
        req.body = std::string(data.substr(header_end + 4));
    }
    
    if (req.path.size() > 1 && req.path[0] == '/') {
        req.path = req.path.substr(1);
    }
    
    if (req.path.empty() || req.path == "/") {
        req.list_buckets = true;
        req.bucket = "";
        req.key = "";
    } else {
        size_t slash_pos = req.path.find('/');
        if (slash_pos != std::string::npos) {
            req.bucket = req.path.substr(0, slash_pos);
            req.key = req.path.substr(slash_pos + 1);
            
            if (req.key.empty() && req.method == HttpMethod::GET) {
                req.list_objects = true;
            }
        } else {
            req.bucket = req.path;
            req.key = "";
        }
    }
    
    return req;
}

HttpResponse HttpParser::make_response(uint16_t code, const std::string& message) {
    HttpResponse resp;
    resp.status_code = code;
    resp.status_message = message;
    resp.headers["connection"] = "close";
    resp.headers["access-control-allow-origin"] = "*";
    resp.headers["access-control-allow-methods"] = "GET, PUT, DELETE, OPTIONS";
    resp.headers["access-control-allow-headers"] = "Content-Type, Content-Length, Content-MD5";
    return resp;
}

HttpResponse HttpParser::make_error_response(uint16_t code, const std::string& message) {
    auto resp = make_response(code, message);
    resp.body = message;
    resp.headers["content-type"] = "text/plain";
    resp.has_body = true;
    return resp;
}

std::string HttpParser::serialize_response(const HttpResponse& resp) {
    std::ostringstream oss;
    oss << "HTTP/1.1 " << resp.status_code << " " << resp.status_message << "\r\n";
    
    for (const auto& [key, value] : resp.headers) {
        oss << key << ": " << value << "\r\n";
    }
    
    if (resp.has_body && !resp.body.empty()) {
        oss << "content-length: " << resp.body.size() << "\r\n";
    }
    
    oss << "\r\n";
    
    std::string result = oss.str();
    if (resp.has_body && !resp.body.empty()) {
        result += resp.body;
    }
    
    return result;
}

}
