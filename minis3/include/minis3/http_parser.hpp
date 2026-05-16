#pragma once

#include <string>
#include <string_view>
#include <unordered_map>
#include <optional>
#include <cstdint>
#include <cmath>

namespace minis3 {

enum class HttpMethod {
    UNKNOWN,
    GET,
    PUT,
    DELETE,
    HEAD,
    POST,
    OPTIONS
};

struct HttpRequest {
    HttpMethod method = HttpMethod::UNKNOWN;
    std::string path;
    std::string query;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
    
    std::string bucket;
    std::string key;
    
    std::optional<uint64_t> content_length;
    std::string content_md5;
    std::optional<std::pair<uint64_t, uint64_t>> range;
    
    bool list_buckets = false;
    bool list_objects = false;
};

struct HttpResponse {
    uint16_t status_code = 200;
    std::string status_message = "OK";
    std::unordered_map<std::string, std::string> headers;
    std::string body;
    
    bool has_body = false;
    int64_t body_size = -1;
    std::string filepath;
};

class HttpParser {
public:
    static std::optional<HttpRequest> parse(std::string_view data);
    static HttpResponse make_response(uint16_t code, const std::string& message);
    static HttpResponse make_error_response(uint16_t code, const std::string& message);
    static std::string serialize_response(const HttpResponse& resp);
    
private:
    static HttpMethod parse_method(std::string_view method);
    static std::string_view trim(std::string_view sv);
};

}
