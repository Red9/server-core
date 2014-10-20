cmake_minimum_required(VERSION 2.8.4)
project(rncvalidate)

add_definitions(
    -std=c++11 # Or -std=c++0x
    -ffunction-sections
    -fdata-sections
    -O3
    #-Wall

    # Other flags
)

set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,--gc-sections")

include_directories(lib)
include_directories(include)

set(SOURCE_DIR src)

set(SOURCES
    ${SOURCE_DIR}/RNCState.cpp
    ${SOURCE_DIR}/Element.cpp
    ${SOURCE_DIR}/NumberSensor.cpp
    ${SOURCE_DIR}/GPSSensor.cpp
    ${SOURCE_DIR}/StreamItem.cpp
    ${SOURCE_DIR}/RNCStreamProcessor.cpp
    ${SOURCE_DIR}/PostfixValidator.cpp
    ${SOURCE_DIR}/RNCStreamPrinter.cpp
    ${SOURCE_DIR}/RNCReader.cpp
    ${SOURCE_DIR}/PrefixValidator.cpp
    ${SOURCE_DIR}/BadStreamItemDropper.cpp
    ${SOURCE_DIR}/Balancer.cpp
    ${SOURCE_DIR}/SensorEstimator.cpp
    ${SOURCE_DIR}/CrossSection.cpp
    ${SOURCE_DIR}/CSStreamProcessor.cpp
    ${SOURCE_DIR}/CSVPrinter.cpp
    ${SOURCE_DIR}/RNCStreamTerminator.cpp
    ${SOURCE_DIR}/CSStreamTerminator.cpp
    ${SOURCE_DIR}/JSONPanel.cpp
    ${SOURCE_DIR}/JSONProperties.cpp
)

#set(SOURCE_FILES main.cpp)
add_executable(rncvalidate main.cpp ${SOURCES})

set(TEST_DIR tests)
set(TEST_SOURCES
    ${SOURCES}
    ${TEST_DIR}/test.cpp
    ${TEST_DIR}/test-BadStreamItemDropper.cpp
    ${TEST_DIR}/test-GPSSensor.cpp
    ${TEST_DIR}/test-RNCState.cpp
    ${TEST_DIR}/test-JSONPanel.cpp
    ${TEST_DIR}/test-JSONProperties.cpp
)


enable_testing(true)
add_executable(unittests ${TEST_SOURCES})
add_test(NAME RunTests COMMAND unittests)
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --verbose DEPENDS unittests)
