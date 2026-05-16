#include "minis3/thread_pool.hpp"
#include "minis3/logger.hpp"

namespace minis3 {

ThreadPool::ThreadPool(size_t num_threads)
    : stop_(false), active_count_(0), num_threads_(num_threads) {}

ThreadPool::~ThreadPool() {
    stop();
}

void ThreadPool::start() {
    LOG_INFO("Starting thread pool with ", num_threads_, " threads");
    workers_.reserve(num_threads_);
    for (size_t i = 0; i < num_threads_; ++i) {
        workers_.emplace_back(&ThreadPool::worker_loop, this);
    }
}

void ThreadPool::stop() {
    stop_.store(true);
    condition_.notify_all();
    for (auto& worker : workers_) {
        if (worker.joinable()) {
            worker.join();
        }
    }
    workers_.clear();
    LOG_INFO("Thread pool stopped");
}

void ThreadPool::enqueue(std::function<void()> task) {
    {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        tasks_.push(std::move(task));
    }
    condition_.notify_one();
}

size_t ThreadPool::pending_count() const {
    std::lock_guard<std::mutex> lock(const_cast<std::mutex&>(queue_mutex_));
    return tasks_.size();
}

void ThreadPool::worker_loop() {
    while (true) {
        std::function<void()> task;
        {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            condition_.wait(lock, [this] {
                return stop_.load() || !tasks_.empty();
            });

            if (stop_.load() && tasks_.empty()) {
                return;
            }

            if (!tasks_.empty()) {
                task = std::move(tasks_.front());
                tasks_.pop();
            }
        }

        if (task) {
            ++active_count_;
            try {
                task();
            } catch (const std::exception& e) {
                LOG_ERROR("Task exception: ", e.what());
            }
            --active_count_;
        }
    }
}

}
