#ifndef RED9_SRLM_JSONGPS_HPP__
#define RED9_SRLM_JSONGPS_HPP__

#include "RNCStreamProcessor.hpp"
#include "JSONOutput.hpp"
#include "Sensor.hpp"
#include "AxisStatistics.hpp"


/**
* Does:
*
* GPS on time (percent on)
* GPS bounding circle
* GPS bounding box
*/

class JSONGPS : public RNCStreamProcessor, public JSONOutput {
private:
    Sensor *sensor;
    AxisStatistics latitudeStatistics;
    AxisStatistics longitudeStatistics;

    int latitudeIndex;
    int longitudeIndex;

    int64_t lastTime;
    int64_t validTime;
    int64_t invalidTime;

    bool firstTime;


    int percentOn();

public:
    JSONGPS(Sensor *sensor_);

    void process(StreamItem *item);

    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);


};

#endif // RED9_SRLM_JSONGPS_HPP__