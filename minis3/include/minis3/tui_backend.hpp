#pragma once

#include "minis3/tui_utils.hpp"

#include <string>
#include <vector>
#include <utility>
#include <fstream>
#include <filesystem>
#include <iostream>

namespace minis3 {

// Abstract data backend — implemented by DirectBackend (server) and HttpBackend (client).
class TUIBackend {
public:
    virtual ~TUIBackend() = default;

    virtual std::vector<std::string> list_buckets() = 0;
    virtual std::vector<std::pair<std::string, size_t>> list_objects(const std::string& bucket) = 0;

    // Returns "" on success, error string on failure.
    virtual std::string create_bucket(const std::string& name) = 0;
    virtual std::string delete_bucket(const std::string& name) = 0;
    virtual std::string put_object(const std::string& bucket, const std::string& key,
                                   const std::string& body) = 0;
    virtual std::string delete_object(const std::string& bucket, const std::string& key) = 0;
    virtual bool download_object(const std::string& bucket, const std::string& key,
                                 const std::string& dest) = 0;

    // Optional hook — override to add an extra numbered item to the main menu.
    virtual bool has_extra_stats() const { return false; }
    virtual void print_extra_stats(size_t /*bucket_count*/) {}
};

// ── Shared menus ─────────────────────────────────────────────────────────────

inline void run_object_menu(TUIBackend& b,
                             const std::string& bucket, const std::string& key, size_t size) {
    using namespace tui_utils;
    while (true) {
        clear_screen();
        print_header("Object: " + key + "  (" + format_size(size) + ")");
        std::cout << "  Route: /" << bucket << "/" << key << "\n\n";
        print_divider();
        std::cout << "  1.  Download                [GET /" << bucket << "/" << key << "]\n";
        std::cout << "  2.  Delete                  [DELETE /" << bucket << "/" << key << "]\n";
        std::cout << "  0.  Back\n\n";

        std::string ch = prompt("> ");

        if (ch == "0") {
            break;
        } else if (ch == "1") {
            std::string dest = prompt("Save to [" + key + "]: ");
            if (dest.empty()) dest = key;
            std::cout << "  Downloading...\n";
            bool ok = b.download_object(bucket, key, dest);
            std::cout << (ok ? "  Saved to '" + dest + "'\n" : "  Download failed.\n");
        } else if (ch == "2") {
            std::string conf = prompt("Delete '" + key + "'? (yes/no): ");
            if (conf == "yes") {
                std::string err = b.delete_object(bucket, key);
                if (err.empty()) {
                    std::cout << "  Deleted '" << key << "'\n";
                    break;
                } else {
                    std::cout << "  Error: " << err << "\n";
                }
            }
        }
    }
}

inline void run_bucket_menu(TUIBackend& b, const std::string& bucket) {
    using namespace tui_utils;
    while (true) {
        clear_screen();
        print_header("Bucket: " + bucket);

        auto objs = b.list_objects(bucket);

        if (!objs.empty()) {
            std::cout << "  Objects (" << objs.size() << "):\n";
            for (size_t i = 0; i < objs.size(); ++i)
                std::cout << "  [" << (i + 1) << "] " << objs[i].first
                          << "  (" << format_size(objs[i].second) << ")\n";
        } else {
            std::cout << "  Objects: (empty bucket)\n";
        }

        std::cout << "\n";
        print_divider();
        std::cout << "  1.  List Objects            [GET /" << bucket << "]\n";
        std::cout << "  2.  Upload File             [PUT /" << bucket << "/{key}]\n";
        std::cout << "  3.  Select Object\n";
        std::cout << "  4.  Delete Bucket           [DELETE /" << bucket << "]\n";
        std::cout << "  0.  Back\n\n";

        std::string ch = prompt("> ");

        if (ch == "0") {
            break;
        } else if (ch == "1") {
            std::cout << "\n  Objects in '" << bucket << "':\n";
            for (auto& [k, sz] : objs)
                std::cout << "    - " << k << "  (" << format_size(sz) << ")\n";
            if (objs.empty()) std::cout << "    (empty)\n";
            std::cout << "\n";
            prompt("[Press Enter]");
        } else if (ch == "2") {
            std::string fp = prompt("Local file path: ");
            if (fp.empty()) continue;

            std::ifstream file(fp, std::ios::binary | std::ios::ate);
            if (!file) { std::cout << "  Cannot open '" << fp << "'\n"; continue; }

            auto fsz = static_cast<size_t>(file.tellg());
            file.seekg(0);

            std::string dflt = std::filesystem::path(fp).filename().string();
            std::string key = prompt("Key name [" + dflt + "]: ");
            if (key.empty()) key = dflt;

            std::cout << "  Uploading " << format_size(fsz) << "...\n";
            std::string body(fsz, '\0');
            file.read(body.data(), static_cast<std::streamsize>(fsz));

            std::string err = b.put_object(bucket, key, body);
            std::cout << (err.empty()
                ? "  Uploaded '" + key + "' OK\n"
                : "  Error: " + err + "\n");
        } else if (ch == "3") {
            if (objs.empty()) { std::cout << "  No objects.\n"; prompt("[Press Enter]"); continue; }
            std::string n = prompt("Object number: ");
            try {
                int idx = std::stoi(n) - 1;
                if (idx >= 0 && idx < static_cast<int>(objs.size()))
                    run_object_menu(b, bucket, objs[idx].first, objs[idx].second);
                else
                    std::cout << "  Invalid selection.\n";
            } catch (...) { std::cout << "  Invalid input.\n"; }
        } else if (ch == "4") {
            std::string conf = prompt("Delete bucket '" + bucket + "' and all its contents? (yes/no): ");
            if (conf == "yes") {
                std::string err = b.delete_bucket(bucket);
                if (err.empty()) {
                    std::cout << "  Deleted bucket '" << bucket << "'\n";
                    break;
                } else {
                    std::cout << "  Error: " << err << "\n";
                }
            }
        }
    }
}

inline void run_main_menu(TUIBackend& b, const std::string& title) {
    using namespace tui_utils;
    while (true) {
        clear_screen();
        print_header(title);

        auto buckets = b.list_buckets();

        if (!buckets.empty()) {
            std::cout << "  Buckets (" << buckets.size() << "):\n";
            for (size_t i = 0; i < buckets.size(); ++i)
                std::cout << "  [" << (i + 1) << "] " << buckets[i] << "\n";
        } else {
            std::cout << "  Buckets: (none)\n";
        }

        std::cout << "\n";
        print_divider();
        std::cout << "  1.  List Buckets            [GET /]\n";
        std::cout << "  2.  Create Bucket           [PUT /{bucket}]\n";
        std::cout << "  3.  Open Bucket\n";
        std::cout << "  4.  Delete Bucket           [DELETE /{bucket}]\n";
        if (b.has_extra_stats())
            std::cout << "  5.  Server Stats\n";
        std::cout << "  0.  Exit\n\n";

        std::string ch = prompt("> ");

        if (ch == "0") {
            break;
        } else if (ch == "1") {
            std::cout << "\n  Buckets (" << buckets.size() << "):\n";
            for (auto& bk : buckets) std::cout << "    - " << bk << "\n";
            if (buckets.empty()) std::cout << "    (none)\n";
            std::cout << "\n";
            prompt("[Press Enter]");
        } else if (ch == "2") {
            std::string name = prompt("Bucket name: ");
            if (name.empty()) continue;
            std::string err = b.create_bucket(name);
            std::cout << (err.empty()
                ? "  Created bucket '" + name + "'\n"
                : "  Error: " + err + "\n");
        } else if (ch == "3") {
            if (buckets.empty()) { std::cout << "  No buckets.\n"; prompt("[Press Enter]"); continue; }
            std::string n = prompt("Bucket number: ");
            try {
                int idx = std::stoi(n) - 1;
                if (idx >= 0 && idx < static_cast<int>(buckets.size()))
                    run_bucket_menu(b, buckets[idx]);
                else
                    std::cout << "  Invalid selection.\n";
            } catch (...) { std::cout << "  Invalid input.\n"; }
        } else if (ch == "4") {
            if (buckets.empty()) { std::cout << "  No buckets.\n"; prompt("[Press Enter]"); continue; }
            std::string n = prompt("Bucket number to delete: ");
            try {
                int idx = std::stoi(n) - 1;
                if (idx >= 0 && idx < static_cast<int>(buckets.size())) {
                    std::string conf = prompt("Delete '" + buckets[idx] + "'? (yes/no): ");
                    if (conf == "yes") {
                        std::string err = b.delete_bucket(buckets[idx]);
                        if (err.empty())
                            std::cout << "  Deleted bucket '" << buckets[idx] << "'\n";
                        else
                            std::cout << "  Error: " << err << "\n";
                    }
                } else {
                    std::cout << "  Invalid selection.\n";
                }
            } catch (...) { std::cout << "  Invalid input.\n"; }
        } else if (ch == "5" && b.has_extra_stats()) {
            b.print_extra_stats(buckets.size());
            prompt("[Press Enter]");
        }
    }
}

} // namespace minis3
