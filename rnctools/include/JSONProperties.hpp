#ifndef RED9_SRLM_JSONPROPERTIES_HPP__
#define RED9_SRLM_JSONPROPERTIES_HPP__

#include "RNCStreamProcessor.hpp"
#include "Element.hpp"
#include "rapidjson/writer.h"
#include "rapidjson/document.h"
#include "JSONOutput.hpp"

class JSONProperties : public RNCStreamProcessor, public JSONOutput {
private:
    int64_t startTime;
    int64_t endTime;
    rapidjson::Document * d;
public:
    JSONProperties();
    JSONProperties(rapidjson::Document * d_);
    void process(StreamItem *item);
    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);
};

#endif // RED9_SRLM_JSONPROPERTIES_HPP__