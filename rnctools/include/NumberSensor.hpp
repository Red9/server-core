#ifndef RED9_SRLM_NUMBERSENSOR_HPP__
#define RED9_SRLM_NUMBERSENSOR_HPP__

#include "Sensor.hpp"
#include "RNCState.hpp"
#include "Element.hpp"

class NumberSensor : public Sensor {
public:
    std::vector<double> scale;
    bool processedScale;
    int bitsPerAxis;
    int bytesPerAxis;
    bool scalable;

    bool magnitudable;

    bool canParse(const unsigned char c);
    int readValue(std::istream *input, int numBytes);
    Element *parse(RNCState *state, std::istream *input);

    bool allowEmptyValues();

    NumberSensor();

};

#endif // RED9_SRLM_NUMBERSENSOR_HPP__