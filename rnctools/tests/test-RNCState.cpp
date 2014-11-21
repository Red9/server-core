#include "catch.hpp"
#include "RNCState.hpp"

#include "fakeit.hpp"


TEST_CASE("Time is constantly increasing") {
    uint32_t cnt = rand();
    int baseTime = 0;
    int clkfreq = 96000000;
    int bitsPerTimestamp = 32;

    RNCState sut(cnt, baseTime, bitsPerTimestamp, clkfreq);

    std::stringstream data;

    int64_t previousTime = 0;

    for (int i = 0; i < 100000; i++) {
        cnt += (rand() % (clkfreq/4)) + clkfreq / 8;

        data.put((cnt >> 0) & 0xff);
        data.put((cnt >> 8) & 0xff);
        data.put((cnt >> 16) & 0xff);
        data.put((cnt >> 24) & 0xff);

        int64_t time = sut.parseTime(&data);
        REQUIRE(time > previousTime);

        previousTime = time;
    }
}