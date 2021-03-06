#include <AxisStatistics.hpp>
#include "StatisticsGPSPath.hpp"

StatisticsGPSPath::StatisticsGPSPath(Sensor *sensor_) {
    sensor = sensor_;

    for (unsigned int i = 0; i < sensor->axes.size(); i++) {
        if (sensor->axes[i].compare("latitude") == 0) {
            latitudeIndex = i;
        }
        if (sensor->axes[i].compare("longitude") == 0) {
            longitudeIndex = i;
        }
    }
    previousLatitude = NAN;
    previousLongitude = NAN;

    // TODO(SRLM): Should sumDistance start out at 0? What if we have no GPS for the entirety? Then should it not be output at all, or output NaN, or ...?
    sumDistance = 0;
    pathSpeedFilter = new FilterExponentialMovingAverage(0.005);
}


double StatisticsGPSPath::haversineInM(double lat1, double long1, double lat2, double long2) {
    // From here: http://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
    const double _eQuatorialEarthRadius = 6378.1370;
    const double _d2r = (M_PI / 180);

    double dlong = (long2 - long1) * _d2r;
    double dlat = (lat2 - lat1) * _d2r;
    double a = pow(sin(dlat / 2.0), 2.0) + cos(lat1 * _d2r) * cos(lat2 * _d2r)
            * pow(sin(dlong / 2.0), 2.0);
    double c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
    double d = _eQuatorialEarthRadius * c;

    return d * 1000.0;
}

void StatisticsGPSPath::process(StreamItem *item) {
    Element *item_ = (Element *) item;
    if (item_->getInWindow() && item_->getSensor() == sensor) {
        double currentLatitude = (*item_)[latitudeIndex];
        double currentLongitude = (*item_)[longitudeIndex];
        int64_t currentTime = item_->getTimestamp();

        //std::cout << currentTime << ", " << std::setprecision(12) << currentLatitude << ", " << currentLongitude << std::endl;

        if (isnan(previousLatitude) || isnan(previousLongitude)) {
            // First time through.
            firstLatitude = previousLatitude = currentLatitude;
            firstLongitude = previousLongitude = currentLongitude;
            firstTime = previousTime = currentTime;
        } else if (isnan(currentLatitude) || isnan(currentLongitude)) {
            // Skip.
        }

            // Yes, I know it's a comparison of a double. The justification:
            // the input is from ints (NMEA string), so the same input will
            // generate the same double. In casual testing it seems to work out.
            // And even if it doesn't: no harm done. It's a simple optimization.
        else if (currentLatitude != previousLatitude || currentLongitude != previousLongitude) {
            double distance = haversineInM(currentLatitude, currentLongitude, previousLatitude, previousLongitude);
            sumDistance += distance;
            double deltaSeconds = (currentTime - previousTime) / 1000000.0; // time is in microseconds
            double speed = pathSpeedFilter->process(distance / deltaSeconds);

//            std::cout << speed << std::endl;

//            std::cout << currentLatitude << ", " << currentLongitude << ", " << previousLatitude << ", " << previousLongitude << ", " << distance << ", " << deltaSeconds << ", " << speed;
//            if (speed > 100) {
//                std::cout << "--------------------------------";
//            }
//            std::cout << std::endl;
            pathSpeed.process(speed);

            previousLatitude = currentLatitude;
            previousLongitude = currentLongitude;
            previousTime = currentTime;


        } else {
//            std::cout << "skipped" << std::endl;
        }
    }
    callNext(item);
}

void StatisticsGPSPath::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {

    if (pathSpeed.getCount() != 0) {
        double greatCircleDistance = haversineInM(previousLatitude, previousLongitude, firstLatitude, firstLongitude);

        writer.Key("distance");
        writer.StartObject();
        writer.Key("path");
        writer.Double(sumDistance);
        writer.Key("greatCircle");
        writer.Double(greatCircleDistance);
        writer.EndObject();

        writer.Key("speed");
        writer.StartObject();
        writer.Key("path");
        writer.StartObject();

        pathSpeed.writeResults(writer);
        writer.EndObject(); // path
        writer.Key("greatCircle");
        writer.Double(greatCircleDistance / ((previousTime - firstTime) / 1000000)); // microseconds to milliseconds
        writer.EndObject(); // speed
    } else {
        // First time through. No data to show.
        writer.Key("distance");
        writer.StartObject();
        writer.Key("path");
        writer.Null();
        writer.Key("greatCircle");
        writer.Null();
        writer.EndObject();

        writer.Key("speed");
        writer.StartObject();
        writer.Key("path");
        writer.StartObject();

        pathSpeed.writeResults(writer);
        writer.EndObject(); // path
        writer.Key("greatCircle");
        writer.Null();
        writer.EndObject(); // speed
    }
}