#ifndef RED9_SRLM_RNCREADER_HPP__
#define RED9_SRLM_RNCREADER_HPP__

#include <Sensor.hpp>
#include <NumberSensor.hpp>
#include <rapidjson/document.h>
#include <GPSSensor.hpp>
#include <stdexcept>

#include "RNCStreamProcessor.hpp"

class RNCReader : public RNCStreamProcessor {
public:
    RNCReader(std::string filename);

    RNCState *processHeader();

    void processBody(RNCState *state);

    ~RNCReader();


private:

    void process(StreamItem *item);

    static const char bufferEnd[];
    static const int bufferEndSize = 8;

    std::string filename;
    std::ifstream *rnc;

    RNCState *parseHeader(rapidjson::Document &header);

    void readHeader(rapidjson::Document &d, std::ifstream *rnc);

    Sensor *parseSensor(const std::string &name, const rapidjson::Value &description);
};


#endif // RED9_SRLM_RNCREADER_HPP__