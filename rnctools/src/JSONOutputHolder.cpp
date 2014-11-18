#include "JSONOutputHolder.hpp"

JSONOutputHolder::JSONOutputHolder(std::string key_) {
    key = key_;
}

void JSONOutputHolder::add(JSONOutput * output){
    outputs.push_back(output);
}

void JSONOutputHolder::writeResults(rapidjson::Writer <rapidjson::StringBuffer> &writer) {
    writer.Key(key.c_str());
    writer.StartObject();
    for (auto out : outputs) {
        out->writeResults(writer);
    }
    writer.EndObject();
}