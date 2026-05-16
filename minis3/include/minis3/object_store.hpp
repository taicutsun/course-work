#pragma once

#include "minis3/http_parser.hpp"
#include "minis3/config.hpp"
#include <filesystem>
#include <string>
#include <unordered_map>
#include <shared_mutex>

namespace minis3 {

class ObjectStore {
public:
    explicit ObjectStore(const Config& config);
    
    HttpResponse handle_put(const HttpRequest& req);
    HttpResponse handle_get(const HttpRequest& req);
    HttpResponse handle_delete(const HttpRequest& req);
    HttpResponse handle_list_buckets(const HttpRequest& req);
    HttpResponse handle_list_objects(const HttpRequest& req);
    HttpResponse handle_create_bucket(const HttpRequest& req);
    HttpResponse handle_delete_bucket(const HttpRequest& req);
    
    void set_buffer_size(size_t size) { buffer_size_ = size; }

private:
    std::filesystem::path get_object_path(const std::string& bucket, 
                                          const std::string& key) const;
    std::filesystem::path get_temp_path(const std::string& bucket,
                                        const std::string& key) const;
    bool ensure_bucket_exists(const std::string& bucket);
    
    std::string compute_md5(const std::filesystem::path& path);
    std::string compute_md5(const char* data, size_t len);

    Config config_;
    size_t buffer_size_ = 65536;
    mutable std::shared_mutex buckets_mutex_;
    std::unordered_map<std::string, std::shared_mutex> bucket_locks_;
    
    std::shared_mutex& get_bucket_lock(const std::string& bucket);
};

}
