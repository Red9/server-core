#include "StatisticsSimple.hpp"
#include "../include/Element.hpp"


StatisticsSimple::StatisticsSimple(Sensor *sensor_, bool magnitude_) {
    sensor = sensor_;


    for (unsigned int i = 0; i < sensor->labels.size(); i++) {
        axes.push_back(new AxisStatistics);
    }

    if (magnitude_) {
        magnitude = new AxisStatistics;
    } else {
        magnitude = nullptr;
    }

}

void StatisticsSimple::process(StreamItem *item) {
    Element *item_ = (Element *) item;
    if (item_->getInWindow() && item_->getSensor() == sensor) {
        double magnitudeValue = 0;
        for (unsigned int i = 0; i < sensor->labels.size(); i++) {
            double value = (*item_)[i];
            axes[i]->process(value);
            if (magnitude) {
                magnitudeValue += value * value;
            }
        }
        if (magnitude) {
            magnitude->process(sqrt(magnitudeValue));
        }
    }
    callNext(item);
}

void StatisticsSimple::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {
    writer.Key(sensor->measurementName.c_str());
    writer.StartObject();
    for (unsigned int i = 0; i < axes.size(); i++) {
        writer.Key((sensor->axes[i]).c_str());
        writer.StartObject();
        axes[i]->writeResults(writer);
        writer.EndObject();
    }
    writer.EndObject();
}
