#ifndef CPP_APP_JOBQUEUE_H
#define CPP_APP_JOBQUEUE_H

#include <condition_variable>
#include <optional>

template <typename T>

class JobQueue {
    std::queue<T> _queue; // Underlying queue storing jobs
    std::mutex _mutex; // Mutex protecting access to _queue and _stopped
    std::condition_variable _cv; // Condition variable used to notify waiting consumers when new items are available or the queue or stopped.
    bool _stopped = false; // Indicates whether the producers will push more jobs
public:
    /**
     *Thread-safe: locks the mutex, pushes the job, then notifies one waiting
     * consumer. The job is passed by value to allow move semantics from the
     * caller; internally std::move is used to avoid an extra copy.
    */
    void push(const T job) {
        {
            std::lock_guard lock(_mutex);
            _queue.push(std::move(job));
        }
        // Notify a single consumer that a new job is available
        _cv.notify_one();
    }
    /**
    * Blocks until either:
    * - a job is available (returns `std::optional<T>` with a value), or
    * - the queue is stopped and empty (returns `std::nullopt`).
    * Note: Consumers should treat `std::nullopt` as a signal to exit.
    */
    std::optional<T> pop() {
        std::unique_lock lock(_mutex);
        // Wait until there is an item or the queue has been stopped.
        _cv.wait(lock, [this]{ return !_queue.empty() || _stopped; });
        if (_queue.empty()) return std::nullopt; // if the queue is finished.
        // Move the front item out and pop it.
        T job = std::move(_queue.front());
        _queue.pop();
        return job;
    }
    /**
    * Marks the queue as stopped and notifies all waiting threads so they can
    * wake, observe the stopped flag, and exit if appropriate. Calling `stop`
    * multiple times is safe.
    */
    void stop() {
        {
            std::lock_guard lock(_mutex);
            _stopped = true;
        }
        _cv.notify_all(); // wake all to exit
    }
};
#endif