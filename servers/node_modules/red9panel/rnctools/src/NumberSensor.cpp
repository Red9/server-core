#include "NumberSensor.hpp"

bool NumberSensor::canParse(const unsigned char c) {
    // Allow for sensor elements, which are OR'd with 0x80
    return c == identifier || (scalable && c == (identifier | 0x80));
}

int NumberSensor::readValue(std::istream *input, int numBytes) {
    int value = 0;

    // Read the bytes in little endian order. Ignore the sign of the bytes
    for (int i = 0; i < numBytes; i++) {
        value = value | ((unsigned char) input->get()) << (i * 8);
    }

    // Get the correct sign into the variable
    int shiftBits = (4 - numBytes) * 8;
    value = (value << shiftBits) >> shiftBits;

    return value;
}

Element *NumberSensor::parse(RNCState *state, std::istream *input) {
    int streamPosition = input->tellg();

    unsigned char identifier = input->get();

    int64_t time = state->parseTime(input);

    double *values = new double[axes.size()];

    if ((identifier & 0x80) != 0) {
        //printf("Scale element: 0x%X\n", identifier);
        // Process scale element
        for (unsigned int i = 0; i < axes.size(); i++) {
            int t = readValue(input, 4);
            float temp = reinterpret_cast<float &> (t);
            values[i] = (double) temp;
            scale[i] = values[i];
            //printf("Scale: %e\n", scale[i]);
        }

    } else {
        for (unsigned int i = 0; i < axes.size(); i++) {
            values[i] = (double) readValue(input, bytesPerAxis);
            // Apply scale
            if (scalable) {
                values[i] *= scale[i];
            }
        }
    }

    if (time == 0) {
        return new Element(this, time, values, streamPosition, new std::string("Invalid timestamp"));
    } else {
        return new Element(this, time, values, streamPosition);
    }
}

bool NumberSensor::allowEmptyValues(){
    return false;
}