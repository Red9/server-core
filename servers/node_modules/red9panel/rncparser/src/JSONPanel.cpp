#include "JSONPanel.hpp"

JSONPanel::JSONPanel() {
    firstRow = true;
}

void JSONPanel::process(CrossSection *item) {
    if (firstRow) {
        firstRow = false;

        for (auto i : item->getData()) {
            values[i.first] = new std::vector<double>;
        }
    }

    times.push_back(item->getTime());
    for (auto i : item->getData()) {
        values[i.first]->push_back(i.second);
    }

    callNext(item);
}

void JSONPanel::writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) {
    writer.Key("panel");
    writer.StartObject();
    writer.Key("time");
    writer.StartArray();
    for (int64_t t : times) {
        writer.Int64(t);
    }
    writer.EndArray();

    for (auto valueItem : values) {
        writer.Key(valueItem.first.c_str());
        writer.StartArray();
        for (double v : *(valueItem.second)) {
            writer.Double(v);
        }
        writer.EndArray();
    }

    writer.EndObject();
}

