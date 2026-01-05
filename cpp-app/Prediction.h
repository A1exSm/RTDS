#ifndef MARKET_INTERCEPT_PREDICTION_H
#define MARKET_INTERCEPT_PREDICTION_H
#include <string>

class Prediction {
public:
    const std::string title;
    const std::string name;
    const std::string outcome;
    const int outcome_value;
    const std::string side;
    const int size;
    const float price;
    const std::string timestamp;

    Prediction(
        const std::string& title,
        const std::string& name,
        const std::string& outcome,
        const int& outcome_value,
        const std::string& side,
        const int& size,
        const float& price,
        const std::string& timestamp) :
    title(title), name(name), outcome(outcome), outcome_value(outcome_value),
    side(side), size(size), price(price), timestamp(timestamp) {}
};

#endif //MARKET_INTERCEPT_PREDICTION_H