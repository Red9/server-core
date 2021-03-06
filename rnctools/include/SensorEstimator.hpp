#ifndef RED9_SRLM_AXISESTIMATOR_HPP__
#define RED9_SRLM_AXISESTIMATOR_HPP__

#include <Sensor.hpp>
#include "CrossSection.hpp"
#include <math.h>

class SensorEstimator {
private:
    // 0 is left of 1 on X scale (think time on X axis).
    Element *p0; // Older element
    Element *p1; // Newer element

    Sensor *sensor;

    double *sumValues;
    int count;
    unsigned int sumValuesLength;

    double calculateLinearValue(int64_t time, int64_t x0, double y0, int64_t x1, double y1);

public:
    SensorEstimator(Sensor *sensor_, bool allowEmptyValues_);

    StreamItem *newElement(Element *element);

    void getEstimate(int64_t atTime, CrossSection *cs);

    bool isReady();

    bool allowEmptyValues;

    bool fullyLoaded();

    void resetEstimate();
};

#endif // RED9_SRLM_AXISESTIMATOR_HPP__