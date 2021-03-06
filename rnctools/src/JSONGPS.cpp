#include "JSONGPS.hpp"
#include "../include/Element.hpp"

JSONGPS::JSONGPS(Sensor *sensor_) {
    sensor = sensor_;

    for (unsigned int i = 0; i < sensor->axes.size(); i++) {
        if (sensor->axes[i].compare("latitude") == 0) {
            latitudeIndex = i;
        }
        if (sensor->axes[i].compare("longitude") == 0) {
            longitudeIndex = i;
        }
    }

    validTime = invalidTime = 0;
    firstTime = true;
}

void JSONGPS::process(StreamItem *item) {
    Element *item_ = (Element *) item;

    if (item_->getInWindow() && item_->getSensor() == sensor) {
        if (firstTime) {
            // First time here
            lastTime = item_->getTimestamp();
            firstTime = false;
        }

        int64_t deltaTime = item_->getTimestamp() - lastTime;
        lastTime = item_->getTimestamp();


        bool hasNAN = false;
        for (int i = 0; i < item_->size(); i++) {
            hasNAN |= isnan((*item_)[i]);
        }
        if (hasNAN) {
            invalidTime += deltaTime;
        } else {
            validTime += deltaTime;
            latitudeStatistics.process((*item_)[latitudeIndex]);
            longitudeStatistics.process((*item_)[longitudeIndex]);
        }

    }

    callNext(item);

}


int JSONGPS::percentOn() {
    if (validTime == 0) {
        return 0;
    } else if (invalidTime == 0) {
        return 100;
    } else {
        return validTime * 100 / (validTime + invalidTime);
    }
}

void JSONGPS::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {
    writer.Key("gpsLock");
    writer.StartObject();
    writer.Key("validPercent");
    writer.Int(percentOn());
    writer.Key("validTime");
    writer.Int64(validTime / 1000); // convert from microseconds to milliseconds
    writer.Key("invalidTime");
    writer.Int64(invalidTime / 1000);
    writer.EndObject();

    if (validTime > 0) {
        writer.Key("boundingCircle");
        writer.StartObject();
        writer.Key("latitude");
        writer.Double(latitudeStatistics.getAverage());
        writer.Key("longitude");
        writer.Double(longitudeStatistics.getAverage());
        writer.EndObject();

        writer.Key("boundingBox");
        writer.StartObject();
        writer.Key("west");
        writer.Double(longitudeStatistics.getMinimum());
        writer.Key("east");
        writer.Double(longitudeStatistics.getMaximum());
        writer.Key("north");
        writer.Double(latitudeStatistics.getMaximum());
        writer.Key("south");
        writer.Double(latitudeStatistics.getMinimum());
        writer.EndObject();
    }
}