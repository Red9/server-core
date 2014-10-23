#ifndef RED9_SRLM_ELEMENT_HPP__
#define RED9_SRLM_ELEMENT_HPP__

#include <stdint.h>

#include "StreamItem.hpp"
#include "Sensor.hpp"

class Sensor;

class Element : public StreamItem{
private:
    int64_t timestamp;
    double *values;
    Sensor *sensor;

public:
    Element(Sensor *sensor_, int64_t timestamp_, double *values_, int streamPosition_);

    Element(Sensor *sensor_, int64_t timestamp_, double *values_, int streamPosition_, std::string *errorMessage_);

    ~Element();

    int64_t getTimestamp();

    Sensor *getSensor();

    int size();

    double operator[](const int index);

};

#endif // RED9_SRLM_ELEMENT_HPP__