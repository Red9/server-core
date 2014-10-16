#include "catch.hpp"
#include "GPSSensor.hpp"
#include "fakeit.hpp"

// P\x3D\x7C\x6A\x5E$GPGGA,183456.265,,,,,0,0,,,M,,M,,*44
// P\xBD\x6B\x7C\x5E$GPGSV,1,1,00*79
// P\xAD\xBD\x89\x5E$GPRMC,183456.265,V,,,,,0.00,0.00,031213,,,N*43


std::istringstream *createStream() {
    char tempString[] = "P\x88\xAB\xCF\x92$GPGGA,130513.300,3354.1408,N,11825.3622,W,1,8,1.14,-5.8,M,-34.2,M,,*4A\0"
            "P\x68\x95\xE0\x92$GPGSA,A,3,22,11,23,01,31,32,14,20,,,,,1.42,1.14,0.84*09\0"
            "P\xC8\x8A\xF4\x92$GPGSV,3,1,11,31,70,111,36,32,61,336,35,01,48,291,32,51,48,160,30*76\0"
            "P\xE8\xDE\x08\x93$GPGSV,3,2,11,11,41,250,30,14,28,051,29,20,24,309,34,22,23,111,31*72\0"
            "P\xE8\xD0\x1A\x93$GPGSV,3,3,11,23,16,259,33,25,10,062,23,19,05,217,17*4D\0"
            "P\x48\xC9\x2D\x93$GPRMC,130513.300,A,3354.1408,N,11825.3622,W,2.90,242.55,040614,,,A*74\0"
            "P\x08\x34\x61\x93$GPGGA,130513.400,3354.1407,N,11825.3622,W,1,8,1.14,-5.8,M,-34.2,M,,*42\0"
            "P\xB8\xFF\x75\x93$GPRMC,130513.400,A,3354.1407,N,11825.3622,W,2.89,241.64,040614,,,A*75\0";
    return new std::istringstream(std::string(tempString, sizeof(tempString)));
}

fakeit::Mock<RNCState> createRNCStateMock() {
    fakeit::Mock<RNCState> rncstate;
    fakeit::When(Method(rncstate, parseTime)).AlwaysDo([](std::istream *input) -> int64_t {
        input->get();
        input->get();
        input->get();
        input->get();
        return 1;
    });
    return rncstate;
}


TEST_CASE("Parse All") {
    auto stream = createStream();

    GPSSensor sut("gps");
    auto mock = createRNCStateMock();

    Element *t0 = sut.parse(&mock.get(), stream); // GGA
    REQUIRE(t0 == NULL);
    Element *t1 = sut.parse(&mock.get(), stream); // GSA
    REQUIRE(t1 == NULL);
    Element *t2 = sut.parse(&mock.get(), stream); // GSV
    REQUIRE(t2 == NULL);
    Element *t3 = sut.parse(&mock.get(), stream); // GSV
    REQUIRE(t3 == NULL);
    Element *t4 = sut.parse(&mock.get(), stream); // GSV
    REQUIRE(t4 == NULL);
    Element *t5 = sut.parse(&mock.get(), stream); // RMC
    REQUIRE(t5 != NULL);
    REQUIRE(t5->isValid());

    // Fragile test: hard code the index keys
    REQUIRE((*t5)[0] == Approx(33.902347)); // Latitude
    REQUIRE((*t5)[1] == Approx(-118.422703)); // Longitude
    REQUIRE((*t5)[2] == Approx(8)); // Satellites
    REQUIRE((*t5)[3] == Approx(1.14)); // Hdop
    REQUIRE((*t5)[4] == Approx(28.4)); // Altitude
    REQUIRE((*t5)[5] == Approx(2.9)); // Speed
    REQUIRE((*t5)[6] == Approx(242.55)); // Heading

    Element *t6 = sut.parse(&mock.get(), stream); // GGA
    REQUIRE(t6 == NULL);


    delete stream;
}