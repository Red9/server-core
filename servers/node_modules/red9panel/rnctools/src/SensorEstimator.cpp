#include "SensorEstimator.hpp"


SensorEstimator::SensorEstimator(Sensor *sensor_, bool allowEmptyValues_) {
    sensor = sensor_;
    p0 = p1 = NULL;
    allowEmptyValues = allowEmptyValues_;

    count = 0;
    sumValuesLength = sensor->axes.size();
    sumValues = new double[sumValuesLength];
    for (unsigned int i = 0; i < sumValuesLength; i++) {
        sumValues[i] = 0.0;
    }

}

StreamItem *SensorEstimator::newElement(Element *element) {
    StreamItem *result = NULL;
    if (element->getSensor() == sensor) {
        result = p0;
        p0 = p1;
        p1 = element;

        for (unsigned int i = 0; i < sumValuesLength; i++) {
            sumValues[i] += (*element)[i];
        }
        count++;
    }
    return result;
}


double SensorEstimator::calculateLinearValue(int64_t time, int64_t x0, double y0, int64_t x1, double y1) {
    // y = mx + b ...
    double slope = (y1 - y0) / (x1 - x0);
    double result = slope * (time - x0) + y0;
    return result;
}

void SensorEstimator::getEstimate(int64_t atTime, CrossSection *cs) {
    if (isReady()) {
        for (unsigned int i = 0; i < sensor->labels.size(); i++) {
            double value;
            if (count > 3) {
                value = sumValues[i] / count;
            } else if (fullyLoaded()) {
                value = calculateLinearValue(atTime, p0->getTimestamp(), (*p0)[i], p1->getTimestamp(), (*p1)[i]);
            } else {
                value = NAN;
            }
            cs->addValue(sensor->labels[i], value);
        }
    }
}

void SensorEstimator::resetEstimate() {
    for (unsigned int i = 0; i < sensor->labels.size(); i++) {
        sumValues[i] = 0.0;
    }
    count = 0;
}

bool SensorEstimator::fullyLoaded() {
    return p0 != NULL && p1 != NULL;
}

bool SensorEstimator::isReady() {
    return fullyLoaded() || allowEmptyValues;
}
