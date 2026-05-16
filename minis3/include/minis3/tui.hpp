#pragma once

#include "minis3/object_store.hpp"
#include "minis3/config.hpp"
#include <atomic>

namespace minis3 {

class ServerTUI {
public:
    ServerTUI(ObjectStore& store, const Config& config, std::atomic<uint64_t>& req_count);
    void run();

private:
    ObjectStore& store_;
    const Config& config_;
    std::atomic<uint64_t>& req_count_;
};

} // namespace minis3
