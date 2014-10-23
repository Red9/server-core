#ifndef RED9_SRLM_SENSOR_HPP__
#define RED9_SRLM_SENSOR_HPP__

#include <iostream>
#include <fstream>
#include <vector>

#include "Element.hpp"
#include "RNCState.hpp"

class Element; // Forward declare for the circular dependency problem
class RNCState;
class Sensor {
public:
    std::string longName;
    std::string shortName;
    char identifier;
    std::vector<std::string> axes;
    std::vector<std::string> units;
    std::vector<std::string> labels;

    virtual bool canParse(const unsigned char c) = 0;

    virtual Element *parse(RNCState *state, std::istream *input) = 0;

    virtual bool allowEmptyValues() = 0;
};

#endif // RED9_SRLM_SENSOR_HPP__