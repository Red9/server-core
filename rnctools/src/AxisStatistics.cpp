#include "AxisStatistics.hpp"

AxisStatistics::AxisStatistics() {
    minimum = std::numeric_limits<double>::max();
    maximum = std::numeric_limits<double>::lowest();
    sum = 0;
    count = 0;
}

void AxisStatistics::process(double value) {
    if (!isnan(value)) {
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
    if (count != 0) {
        writer.Key("minimum");
        writer.Double(minimum);
        writer.Key("maximum");
        writer.Double(maximum);
        writer.Key("average");
        writer.Double(sum / count);
    }else{
        writer.Key("minimum");
        writer.Null();
        writer.Key("maximum");
        writer.Null();
        writer.Key("average");
        writer.Null();
    }

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

int AxisStatistics::getCount(){
    return count;
}