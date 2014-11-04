#include "AxisStatistics.hpp"

AxisStatistics::AxisStatistics() {
    minimum = std::numeric_limits<double>::max();
    maximum = std::numeric_limits<double>::lowest();
    sum = 0;
    count = 0;
}

void AxisStatistics::process(double value) {
    if(!isnan(value)) {
        sum += value;
        count++;
        if (value > maximum) {
            maximum = value;
        }
        if (value < minimum) {
            minimum = value;
        }
    }
}

void AxisStatistics::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {
    writer.Key("minimum");
    writer.Double(minimum);
    writer.Key("maximum");
    writer.Double(maximum);
    writer.Key("average");
    writer.Double(sum / count);
    writer.Key("count");
    writer.Int(count);
}

double AxisStatistics::getMinimum() {
    return minimum;
}

double AxisStatistics::getMaximum() {
    return maximum;
}

double AxisStatistics::getAverage() {
    return sum / count;
}