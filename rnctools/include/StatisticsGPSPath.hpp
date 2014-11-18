#include "RNCStreamProcessor.hpp"
#include "Sensor.hpp"

#include "rapidjson/writer.h"
#include "JSONOutput.hpp"

#include "AxisStatistics.hpp"
#include "FilterExponentialMovingAverage.hpp"

#include <math.h>

#ifndef RED9_SRLM_STATISTICSGPSPATH_HPP__
#define RED9_SRLM_STATISTICSGPSPATH_HPP__

class StatisticsGPSPath : public RNCStreamProcessor, public JSONOutput {
private:
    Sensor * sensor;
    int latitudeIndex;
    int longitudeIndex;

    double previousLatitude;
    double previousLongitude;

    double sumDistance;

    double haversineInM(double lat1, double long1, double lat2, double long2);

    double firstLatitude;
    double firstLongitude;

    int64_t previousTime;
    int64_t firstTime;

    FilterExponentialMovingAverage* pathSpeedFilter;
    AxisStatistics pathSpeed;


public:
    StatisticsGPSPath(Sensor * sensor_);

    void process(StreamItem *item);

    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);
};


#endif // RED9_SRLM_STATISTICSGPSPATH_HPP__