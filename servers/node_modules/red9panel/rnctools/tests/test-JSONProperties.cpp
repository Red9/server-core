#include "catch.hpp"
#include "JSONProperties.hpp"

TEST_CASE("JSONProperties outputs correct startTime and endTime") {
    JSONProperties sut;

    int64_t startTime = rand() & 0xfffff;
    int64_t endTime = (rand() & 0xfffff) + startTime;

    Element start(NULL, startTime, NULL, 1);
    Element end(NULL, endTime, NULL, 1);

    sut.process(&start);
    for (int64_t time = startTime + 100; time < endTime; time += rand() & 0xfff) {
        Element timeTemp(NULL, time, NULL, 1);
        sut.process(&timeTemp);
    }
    sut.process(&end);

    rapidjson::StringBuffer s;
    rapidjson::Writer<rapidjson::StringBuffer> writer(s);

    writer.StartObject();
    sut.writeResults(writer);
    writer.EndObject();

    // This is a little fragile: it assumes an ordering.
    std::ostringstream desiredResult;
    desiredResult << "{\"startTime\":" << startTime << ",\"endTime\":" << endTime << "}";

    REQUIRE(desiredResult.str() == s.GetString());
}