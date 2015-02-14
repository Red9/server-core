#ifndef RED9_SRLM_AXISSTATISTICS_HPP__
#define RED9_SRLM_AXISSTATISTICS_HPP__

#include <limits>
#include <iostream>
#include <math.h>

#include "rapidjson/writer.h"
#include "JSONOutput.hpp"

/**
* @TODO: This doesn't work well on circular spaces... Like latitude, longitude.
*/

class AxisStatistics : public JSONOutput {
private:
    double minimum;
    double maximum;
    double sum;
    int count;
public:
    AxisStatistics();

    void process(double value);

    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);

    double getMinimum();

    double getMaximum();

    double getAverage();

    int getCount();
};


#endif // RED9_SRLM_AXISSTATISTICS_HPP__