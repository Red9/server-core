#include "Element.hpp"

Element::Element(Sensor *sensor_, int64_t timestamp_, double *values_, int streamPosition_)
        : StreamItem(streamPosition_, true, NULL) {
    timestamp = timestamp_;
    values = values_;
    sensor = sensor_;
    inWindow = true;
}

Element::Element(Sensor *sensor_, int64_t timestamp_, double *values_, int streamPosition_, std::string *errorMessage_)
        : StreamItem(streamPosition_, false, errorMessage_) {
    timestamp = timestamp_;
    values = values_;
    sensor = sensor_;
    inWindow = true;
}

Element::~Element() {
    if (values != NULL) {
        delete values;
    }
}


int64_t Element::getTimestamp() {
    return timestamp;
}

Sensor *Element::getSensor() {
    return sensor;
}

int Element::size() {
    return sensor->axes.size();
}

double Element::operator[](const int index) {
    return values[index];
}


void Element::setInWindow(bool newValue) {
    inWindow = newValue;
}

bool Element::getInWindow() {
    return inWindow;
}