#include "minis3/tui.hpp"
#include "minis3/tui_backend.hpp"

#include <filesystem>
#include <system_error>

namespace minis3 {

class DirectBackend : public TUIBackend {
public:
    DirectBackend(ObjectStore& store, const Config& config, std::atomic<uint64_t>& req_count)
        : store_(store), config_(config), req_count_(req_count) {}

    std::vector<std::string> list_buckets() override {
        HttpRequest req;
        req.method = HttpMethod::GET;
        req.list_buckets = true;
        auto resp = store_.handle_list_buckets(req);
        return tui_utils::xml_values(resp.body, "Name");
    }

    std::vector<std::pair<std::string, size_t>> list_objects(const std::string& bucket) override {
        HttpRequest req;
        req.method = HttpMethod::GET;
        req.bucket = bucket;
        req.list_objects = true;
        auto resp = store_.handle_list_objects(req);

        auto keys  = tui_utils::xml_values(resp.body, "Key");
        auto sizes = tui_utils::xml_values(resp.body, "Size");

        std::vector<std::pair<std::string, size_t>> objs;
        for (size_t i = 0; i < keys.size(); ++i) {
            size_t sz = (i < sizes.size()) ? std::stoul(sizes[i]) : 0;
            objs.emplace_back(keys[i], sz);
        }
        return objs;
    }

    std::string create_bucket(const std::string& name) override {
        HttpRequest req;
        req.method = HttpMethod::PUT;
        req.bucket = name;
        auto resp = store_.handle_create_bucket(req);
        return resp.status_code == 200 ? "" : resp.status_message;
    }

    std::string delete_bucket(const std::string& name) override {
        HttpRequest req;
        req.method = HttpMethod::DELETE;
        req.bucket = name;
        store_.handle_delete_bucket(req);
        return "";
    }

    std::string put_object(const std::string& bucket, const std::string& key,
                            const std::string& body) override {
        HttpRequest req;
        req.method = HttpMethod::PUT;
        req.bucket = bucket;
        req.key    = key;
        req.body   = body;
        req.content_length = body.size();
        auto resp = store_.handle_put(req);
        return resp.status_code == 200 ? "" : resp.status_message;
    }

    std::string delete_object(const std::string& bucket, const std::string& key) override {
        HttpRequest req;
        req.method = HttpMethod::DELETE;
        req.bucket = bucket;
        req.key    = key;
        store_.handle_delete(req);
        return "";
    }

    bool download_object(const std::string& bucket, const std::string& key,
                         const std::string& dest) override {
        HttpRequest req;
        req.method = HttpMethod::GET;
        req.bucket = bucket;
        req.key    = key;
        auto resp = store_.handle_get(req);
        if (resp.status_code != 200 || resp.filepath.empty()) return false;
        std::error_code ec;
        std::filesystem::copy_file(resp.filepath, dest,
            std::filesystem::copy_options::overwrite_existing, ec);
        return !ec;
    }

    bool has_extra_stats() const override { return true; }

    void print_extra_stats(size_t bucket_count) override {
        std::string proto = config_.use_tls ? "HTTPS" : "HTTP";
        std::cout << "\n  Server Statistics:\n"
                  << "    Protocol : " << proto << "\n"
                  << "    Port     : " << config_.port << "\n"
                  << "    Threads  : " << config_.thread_count << "\n"
                  << "    Buffer   : " << tui_utils::format_size(config_.buffer_size) << "\n"
                  << "    Storage  : " << config_.storage_dir.string() << "\n"
                  << "    Requests : " << req_count_.load() << "\n"
                  << "    Buckets  : " << bucket_count << "\n\n";
    }

private:
    ObjectStore& store_;
    const Config& config_;
    std::atomic<uint64_t>& req_count_;
};

ServerTUI::ServerTUI(ObjectStore& store, const Config& config, std::atomic<uint64_t>& req_count)
    : store_(store), config_(config), req_count_(req_count) {}

void ServerTUI::run() {
    DirectBackend backend(store_, config_, req_count_);
    std::string proto = config_.use_tls ? "HTTPS" : "HTTP";
    run_main_menu(backend, "MiniS3 Server Console  " + proto + ":" + std::to_string(config_.port));
    std::cout << "\n  Console closed. Server keeps running.\n\n";
}

} // namespace minis3
