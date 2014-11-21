#include "catch.hpp"
#include "JSONPanel.hpp"
#include "fakeit.hpp"

TEST_CASE("Basic") {
    JSONPanel sut;

    for (int i = 1; i < 9; i++) {
        CrossSection cs(i * 1000);
        cs.addValue("a", i * i * 0.2);
        cs.addValue("b", i * 3.1);
        sut.process(&cs);
    }

    rapidjson::StringBuffer s;
    rapidjson::Writer<rapidjson::StringBuffer> writer(s);

    writer.StartObject();
    sut.writeResults(writer);
    writer.EndObject();

    std::string result = "{\"panel\":{\"time\":[1,2,3,4,5,6,7,8],\"a\":[0.2,0.8,1.8,3.2,5.0,7.2,9.8,12.8],\"b\":[3.1,6.2,9.3,12.4,15.5,18.6,21.7,24.8]}}";

    REQUIRE(s.GetString() == result);
}
