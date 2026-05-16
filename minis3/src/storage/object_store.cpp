#include "minis3/object_store.hpp"
#include "minis3/logger.hpp"
#include <openssl/evp.h>
#include <random>
#include <iomanip>
#include <fstream>

namespace { constexpr size_t kMd5Size = 16; }

namespace minis3 {

namespace {

std::string bytes_to_hex(const unsigned char* bytes, size_t len) {
    std::ostringstream oss;
    for (size_t i = 0; i < len; ++i) {
        oss << std::hex << std::setfill('0') << std::setw(2) << (int)bytes[i];
    }
    return oss.str();
}

std::string generate_temp_id() {
    static thread_local std::random_device rd;
    static thread_local std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    std::ostringstream oss;
    oss << "temp_";
    for (int i = 0; i < 32; ++i) {
        oss << std::hex << dis(gen);
    }
    return oss.str();
}

} // namespace

ObjectStore::ObjectStore(const Config& config) : config_(config) {
    buffer_size_ = config.buffer_size;
    
    std::error_code ec;
    std::filesystem::create_directories(config_.storage_dir, ec);
    
    LOG_INFO("ObjectStore initialized at: ", config_.storage_dir.string());
}

std::filesystem::path ObjectStore::get_object_path(const std::string& bucket,
                                                     const std::string& key) const {
    return config_.storage_dir / bucket / key;
}

std::filesystem::path ObjectStore::get_temp_path(const std::string& bucket,
                                                  const std::string& /*key*/) const {
    auto bucket_dir = config_.storage_dir / bucket;
    return bucket_dir / (generate_temp_id() + ".tmp");
}

bool ObjectStore::ensure_bucket_exists(const std::string& bucket) {
    auto bucket_path = config_.storage_dir / bucket;
    std::error_code ec;
    std::filesystem::create_directories(bucket_path, ec);
    return std::filesystem::exists(bucket_path, ec);
}

std::shared_mutex& ObjectStore::get_bucket_lock(const std::string& bucket) {
    std::shared_lock<std::shared_mutex> read_lock(buckets_mutex_);
    auto it = bucket_locks_.find(bucket);
    if (it != bucket_locks_.end()) {
        return it->second;
    }
    read_lock.unlock();
    
    std::unique_lock<std::shared_mutex> write_lock(buckets_mutex_);
    return bucket_locks_[bucket];
}

std::string ObjectStore::compute_md5(const char* data, size_t len) {
    unsigned char digest[kMd5Size];
    unsigned int digest_len = 0;
    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, EVP_md5(), nullptr);
    EVP_DigestUpdate(ctx, data, len);
    EVP_DigestFinal_ex(ctx, digest, &digest_len);
    EVP_MD_CTX_free(ctx);
    return bytes_to_hex(digest, digest_len);
}

std::string ObjectStore::compute_md5(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) return "";

    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, EVP_md5(), nullptr);

    char buffer[65536];
    while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0) {
        EVP_DigestUpdate(ctx, buffer, file.gcount());
    }

    unsigned char digest[kMd5Size];
    unsigned int digest_len = 0;
    EVP_DigestFinal_ex(ctx, digest, &digest_len);
    EVP_MD_CTX_free(ctx);

    return bytes_to_hex(digest, digest_len);
}

HttpResponse ObjectStore::handle_put(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }
    if (req.key.empty()) {
        return HttpParser::make_error_response(400, "Object key required");
    }
    if (!req.content_length) {
        return HttpParser::make_error_response(411, "Content-Length required");
    }
    
    auto& lock = get_bucket_lock(req.bucket);
    std::unique_lock<std::shared_mutex> write_lock(lock);
    
    ensure_bucket_exists(req.bucket);
    
    auto temp_path = get_temp_path(req.bucket, req.key);
    auto final_path = get_object_path(req.bucket, req.key);
    
    std::ofstream temp_file(temp_path, std::ios::binary | std::ios::trunc);
    if (!temp_file) {
        LOG_ERROR("Failed to create temp file: ", temp_path);
        return HttpParser::make_error_response(500, "Failed to create temp file");
    }
    
    size_t total_written = 0;
    const char* body_data = req.body.data();
    size_t body_len = req.body.size();
    
    temp_file.write(body_data, body_len);
    if (!temp_file) {
        LOG_ERROR("Failed to write to temp file");
        std::filesystem::remove(temp_path);
        return HttpParser::make_error_response(500, "Write failed");
    }
    total_written += body_len;
    
    temp_file.close();
    
    if (req.content_md5.empty() == false) {
        std::string computed_md5 = compute_md5(temp_path);
        if (computed_md5 != req.content_md5) {
            LOG_WARN("MD5 mismatch: expected=", req.content_md5, 
                     ", computed=", computed_md5);
            std::filesystem::remove(temp_path);
            return HttpParser::make_error_response(400, "Content-MD5 mismatch");
        }
    }
    
    std::error_code ec;
    std::filesystem::rename(temp_path, final_path, ec);
    
    if (ec) {
        LOG_ERROR("Failed to rename temp file: ", ec.message());
        std::filesystem::remove(temp_path);
        return HttpParser::make_error_response(500, "Failed to store object");
    }
    
    LOG_INFO("PUT ", req.bucket, "/", req.key, " (", total_written, " bytes)");
    
    auto resp = HttpParser::make_response(200, "OK");
    resp.headers["etag"] = "\"" + compute_md5(final_path) + "\"";
    return resp;
}

HttpResponse ObjectStore::handle_get(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }
    if (req.key.empty()) {
        return HttpParser::make_error_response(400, "Object key required");
    }
    
    auto& lock = get_bucket_lock(req.bucket);
    std::shared_lock<std::shared_mutex> read_lock(lock);
    
    auto path = get_object_path(req.bucket, req.key);
    
    std::error_code ec;
    if (!std::filesystem::exists(path, ec)) {
        return HttpParser::make_error_response(404, "Object not found");
    }
    
    auto file_size = std::filesystem::file_size(path, ec);
    
    uint64_t range_start = 0;
    uint64_t range_end = file_size - 1;
    
    if (req.range) {
        range_start = req.range->first;
        range_end = req.range->second;
        if (range_end >= file_size) {
            range_end = file_size - 1;
        }
    }
    
    auto resp = HttpParser::make_response(200, "OK");
    resp.filepath = path.string();
    resp.has_body = true;
    resp.body_size = range_end - range_start + 1;
    
    std::string content_type = "application/octet-stream";
    resp.headers["content-type"] = content_type;
    resp.headers["accept-ranges"] = "bytes";
    resp.headers["content-length"] = std::to_string(resp.body_size);
    resp.headers["etag"] = "\"" + compute_md5(path) + "\"";
    
    if (req.range) {
        resp.status_code = 206;
        resp.status_message = "Partial Content";
        resp.headers["content-range"] = "bytes " + 
            std::to_string(range_start) + "-" + 
            std::to_string(range_end) + "/" + 
            std::to_string(file_size);
    }
    
    LOG_INFO("GET ", req.bucket, "/", req.key, 
             " (", resp.body_size, " bytes)");
    
    return resp;
}

HttpResponse ObjectStore::handle_delete(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }
    if (req.key.empty()) {
        return HttpParser::make_error_response(400, "Object key required");
    }
    
    auto& lock = get_bucket_lock(req.bucket);
    std::unique_lock<std::shared_mutex> write_lock(lock);
    
    auto path = get_object_path(req.bucket, req.key);
    
    std::error_code ec;
    if (!std::filesystem::exists(path, ec)) {
        auto resp = HttpParser::make_response(204, "No Content");
        return resp;
    }
    
    std::filesystem::remove(path, ec);
    
    if (ec) {
        LOG_ERROR("Failed to delete object: ", ec.message());
        return HttpParser::make_error_response(500, "Failed to delete object");
    }
    
    LOG_INFO("DELETE ", req.bucket, "/", req.key);
    
    auto resp = HttpParser::make_response(204, "No Content");
    return resp;
}

HttpResponse ObjectStore::handle_list_buckets(const HttpRequest& /*req*/) {
    std::shared_lock<std::shared_mutex> read_lock(buckets_mutex_);
    
    std::error_code ec;
    if (!std::filesystem::exists(config_.storage_dir, ec)) {
        auto resp = HttpParser::make_response(200, "OK");
        resp.body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ListAllMyBucketsResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Buckets></Buckets></ListAllMyBucketsResult>";
        resp.headers["content-type"] = "application/xml";
        resp.has_body = true;
        return resp;
    }
    
    std::ostringstream oss;
    oss << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    oss << "<ListAllMyBucketsResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\">\n";
    oss << "  <Buckets>\n";
    
    for (const auto& entry : std::filesystem::directory_iterator(config_.storage_dir, ec)) {
        if (entry.is_directory()) {
            oss << "    <Bucket><Name>" << entry.path().filename().string() << "</Name></Bucket>\n";
        }
    }
    
    oss << "  </Buckets>\n";
    oss << "</ListAllMyBucketsResult>";
    
    auto resp = HttpParser::make_response(200, "OK");
    resp.body = oss.str();
    resp.headers["content-type"] = "application/xml";
    resp.has_body = true;
    
    LOG_INFO("LIST buckets");
    
    return resp;
}

HttpResponse ObjectStore::handle_list_objects(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }
    
    auto& lock = get_bucket_lock(req.bucket);
    std::shared_lock<std::shared_mutex> read_lock(lock);
    
    auto bucket_path = config_.storage_dir / req.bucket;
    
    std::error_code ec;
    if (!std::filesystem::exists(bucket_path, ec)) {
        return HttpParser::make_error_response(404, "Bucket not found");
    }
    
    std::ostringstream oss;
    oss << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    oss << "<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\">\n";
    oss << "  <Name>" << req.bucket << "</Name>\n";
    oss << "  <Contents>\n";
    
    for (const auto& entry : std::filesystem::directory_iterator(bucket_path, ec)) {
        if (entry.is_regular_file()) {
            oss << "    <Key>" << entry.path().filename().string() << "</Key>\n";
            oss << "    <Size>" << entry.file_size(ec) << "</Size>\n";
        }
    }
    
    oss << "  </Contents>\n";
    oss << "</ListBucketResult>";
    
    auto resp = HttpParser::make_response(200, "OK");
    resp.body = oss.str();
    resp.headers["content-type"] = "application/xml";
    resp.has_body = true;
    
    LOG_INFO("LIST objects in bucket: ", req.bucket);

    return resp;
}

HttpResponse ObjectStore::handle_create_bucket(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }

    auto bucket_path = config_.storage_dir / req.bucket;
    std::error_code ec;
    std::filesystem::create_directories(bucket_path, ec);

    if (ec) {
        return HttpParser::make_error_response(500, "Failed to create bucket");
    }

    LOG_INFO("Created bucket: ", req.bucket);
    return HttpParser::make_response(200, "OK");
}

HttpResponse ObjectStore::handle_delete_bucket(const HttpRequest& req) {
    if (req.bucket.empty()) {
        return HttpParser::make_error_response(400, "Bucket name required");
    }

    auto bucket_path = config_.storage_dir / req.bucket;
    std::error_code ec;

    if (!std::filesystem::exists(bucket_path, ec)) {
        return HttpParser::make_response(204, "No Content");
    }

    std::filesystem::remove_all(bucket_path, ec);
    if (ec) {
        return HttpParser::make_error_response(500, "Failed to delete bucket");
    }

    LOG_INFO("Deleted bucket: ", req.bucket);
    return HttpParser::make_response(204, "No Content");
}

}
