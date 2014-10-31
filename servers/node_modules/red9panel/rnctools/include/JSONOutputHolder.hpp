#ifndef RED9_SRLM_JSONOUTPUTHOLDER_HPP__
#define RED9_SRLM_JSONOUTPUTHOLDER_HPP__

#include <vector>
#include <string>
#include "JSONOutput.hpp"

class JSONOutputHolder : public JSONOutput {
    std::vector<JSONOutput *> outputs;
    std::string key;
public:
    JSONOutputHolder(std::string key_);

    void add(JSONOutput *output);

    void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer);
};

#endif // RED9_SRLM_JSONOUTPUTHOLDER_HPP__