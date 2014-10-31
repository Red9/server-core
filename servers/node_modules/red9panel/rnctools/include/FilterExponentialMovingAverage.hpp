#ifndef RED9_SRLM_EXPONENTIALMOVINGAVERAGE_HPP__
#define RED9_SRLM_EXPONENTIALMOVINGAVERAGE_HPP__

#include <math.h>

class FilterExponentialMovingAverage {
private:
    double alpha;
    double smoothed;

public:
    FilterExponentialMovingAverage(double alpha_);

    double process(double value);
};


#endif // RED9_SRLM_EXPONENTIALMOVINGAVERAGE_HPP__