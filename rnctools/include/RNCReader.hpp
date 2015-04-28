#ifndef RED9_SRLM_RNCREADER_HPP__
#define RED9_SRLM_RNCREADER_HPP__

#include <map>
#include "Sensor.hpp"
#include "NumberSensor.hpp"
#include "rapidjson/document.h"
#include "GPSSensor.hpp"
#include <stdexcept>
#include "ExtractHeader.hpp"
#include "RNCStreamProcessor.hpp"

#include "FilterExponentialMovingAverage.hpp"

class RNCReader : public RNCStreamProcessor {
public:
    RNCReader(std::string filename);

    RNCState *processHeader(std::map<std::string,  double > filters);

    void processBody(RNCState *state);

    ~RNCReader();


private:

    void process(StreamItem *item);

    static const char bufferEnd[];
    static const int bufferEndSize = 8;

    std::string filename;
    std::ifstream *rnc;

    std::map<std::string, std::string> measurementNameMap;

    RNCState *parseHeader(rapidjson::Document &header, std::map<std::string,  double>  filters);

    Sensor *parseSensor(const std::string &name, const rapidjson::Value &description, double filter);
};


#endif // RED9_SRLM_RNCREADER_HPP__