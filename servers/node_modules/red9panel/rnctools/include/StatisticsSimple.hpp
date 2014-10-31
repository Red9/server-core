#include "RNCStreamProcessor.hpp"
#include "Sensor.hpp"
#include "AxisStatistics.hpp"

#include "rapidjson/writer.h"
#include "JSONOutput.hpp"

#ifndef RED9_SRLM_STATISTICSSIMPLE_HPP__
#define RED9_SRLM_STATISTICSSIMPLE_HPP__

class StatisticsSimple : public RNCStreamProcessor, public JSONOutput {
private:
    Sensor * sensor;
    AxisStatistics * magnitude;

    std::vector<AxisStatistics *> axes;

public:
    StatisticsSimple(Sensor * sensor_, bool magnitude_);

    void process(StreamItem *item);


    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);
};


#endif // RED9_SRLM_STATISTICSSIMPLE_HPP__