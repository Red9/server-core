#ifndef RED9_SRLM_JSONPANEL_HPP__
#define RED9_SRLM_JSONPANEL_HPP__

#include "CSStreamProcessor.hpp"
#include <CrossSection.hpp>
#include <vector>

#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"

#include "JSONOutput.hpp"

/**
* @warning: there is no maximum size limiter here! It will happily try to store an entire panel.
*/
class JSONPanel : public CSStreamProcessor, public JSONOutput {
private:
    std::map<std::string, std::vector<double> *> values;
    std::vector<int64_t> times;
    bool firstRow;
public:
    JSONPanel();

    void process(CrossSection *item);

    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);
};

#endif // RED9_SRLM_JSONPANEL_HPP__