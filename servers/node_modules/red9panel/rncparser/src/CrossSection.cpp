#include "CrossSection.hpp"

CrossSection::CrossSection(int64_t timestamp_) {
    timestamp = timestamp_;
}

void CrossSection::addValue(std::string label, double value) {
    data[label] = value;
}

std::map<std::string, double> CrossSection::getData() {
    return data;
}

int64_t CrossSection::getTime(){
    return timestamp;
}