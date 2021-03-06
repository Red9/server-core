#include "JSONProperties.hpp"

JSONProperties::JSONProperties() {
    startTime = -1;
    d = NULL;
}

JSONProperties::JSONProperties(rapidjson::Document * d_) {
    startTime = -1;
    d = d_;
}

void JSONProperties::process(StreamItem *item) {
    Element *item_ = (Element *) item;
    if (item_->getInWindow()) {
        int64_t currentTime = item_->getTimestamp();
        if (startTime == -1) {
            startTime = currentTime;
        }
        endTime = currentTime;
    }

    callNext(item);
}

void JSONProperties::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {
    writer.Key("startTime");
    writer.Int64(startTime / 1000); // Convert to milliseconds
    writer.Key("endTime");
    writer.Int64(endTime / 1000); // Convert to milliseconds

    if(d != NULL){
        writer.Key("source");
        d->Accept(writer);
    }
}