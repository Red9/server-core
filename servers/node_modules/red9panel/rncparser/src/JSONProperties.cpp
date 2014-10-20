#include "JSONProperties.hpp"

JSONProperties::JSONProperties() {
    startTime = -1;
}

void JSONProperties::process(StreamItem *item) {
    if (item->isValid()) {
        int64_t currentTime = ((Element *) item)->getTimestamp();
        if (startTime == -1) {
            startTime = currentTime;
        }
        endTime = currentTime;
    }
    callNext(item);
}

void JSONProperties::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer){
    writer.Key("startTime");
    writer.Int64(startTime);
    writer.Key("endTime");
    writer.Int64(endTime);
}