#include "FilterExponentialMovingAverage.hpp"

FilterExponentialMovingAverage::FilterExponentialMovingAverage(double alpha_) {
    alpha = alpha_;
    smoothed = NAN;
}

double FilterExponentialMovingAverage::process(double value) {
    if (isnan(smoothed)) {
        smoothed = value;
    } else {
        smoothed = alpha * value + (1.0 - alpha) * smoothed;
    }

    return smoothed;
}