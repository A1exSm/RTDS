#ifndef CPP_APP_PREDDATA_H
#define CPP_APP_PREDDATA_H
#include <ostream>
enum class AlerterType {
    None, PriceSpike, WhaleAccumulation, Combined
};
class PredData { // Exponential Moving Average (EMA) Approach
    // EMA | Price
    float _price_0 = 0.0f;
    float _price_1 = 0.0f;
    // EMA | Volume
    float _size_0 = 0.0f;
    float _size_1 = 0.0f;
    // Alpha
    const float _alpha = 0.01f; // 1% average of new price (low alpha = smoother line, slower reaction)
    // Here I create a warm-up period
    int _count_0 = 0;
    int _count_1 = 0;
    const int _initial_wait = 500;
    // Mutex for an individual object, as opposed to global mutex
    mutable std::mutex _mutex;
public:
    const float &getFirstPriceAverage() const {
        std::lock_guard lock(_mutex);
        return _price_0;
    }
    const float &getSecondPriceAverage() const {
        std::lock_guard lock(_mutex);
        return _price_1;
    }
    const float &getFirstSizeAverage() const {
        std::lock_guard lock(_mutex);
        return _size_0;
    }
    const float &getSecondSizeAverage() const {
        std::lock_guard lock(_mutex);
        return _size_1;
    }
    AlerterType processPrice(const float &price, const int &size, const int &outcome) {
        std::lock_guard lock(_mutex);
        AlerterType alert = AlerterType::None;
        float* p_ema = (outcome == 0) ? &_price_0 : &_price_1;
        float* s_ema = (outcome == 0) ? &_size_0 : &_size_1;
        // Warm-up period
        if (int* count = (outcome == 0)
            ? &_count_0
            : &_count_1;
            *count < _initial_wait) {
            if (*count == 0) {
                *p_ema = price;
                *s_ema = static_cast<float>(size);
            } else {
                *p_ema = ((*p_ema * static_cast<float>(*count)) + price) / static_cast<float>(*count + 1);
                *s_ema = ((*s_ema * static_cast<float>(*count)) + static_cast<float>(size)) / static_cast<float>(*count + 1);
            }
            (*count)++;
            return alert;
        }
        // Post Warm-up
        const float p_diff = (*p_ema > 0) ? std::abs(price - *p_ema) / *p_ema : 0.0f;
        const float s_ratio = (*s_ema > 1.0f ? static_cast<float>(size) / *s_ema : 0.0f);
        // threshold
        const bool high_p = p_diff > 0.5f; // price > 50% increase
        const bool high_s = s_ratio > 5.0f; // 5x normal trade size
        // Determining alert type
        if (high_p && high_s) alert = AlerterType::Combined;
        else if (high_p) alert = AlerterType::PriceSpike;
        else if (high_s) alert = AlerterType::WhaleAccumulation;
        // Catch low volumes
        if (size < 100) alert = AlerterType::None;
        // Update EMAs
        *p_ema = (price * _alpha) + (*p_ema * (1 - _alpha));
        *s_ema = (static_cast<float>(size) * _alpha) + (*s_ema * (1 - _alpha));
        return alert;
    }
};
#endif //CPP_APP_PREDDATA_H