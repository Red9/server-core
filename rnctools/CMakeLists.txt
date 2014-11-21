cmake_minimum_required(VERSION 2.8.4)
project(rncvalidate)

add_definitions(
    -std=c++11 # Or -std=c++0x
    -ffunction-sections
    -fdata-sections
    -Os
    -march=native
    -pipe

    #Debugging symbols
    #-g
    -Wall

    # Other flags
)

set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -Wl,--gc-sections")

include_directories(lib)
include_directories(include)

file( GLOB LIB_SOURCES src/*.cpp )
file( GLOB LIB_HEADERS include/*.cpp )
add_library( corecode ${LIB_SOURCES} ${LIB_HEADERS} )

add_executable(rncprocessor rncprocessor.cpp)
target_link_libraries(rncprocessor corecode)

add_executable(correctrnc correctrnc.cpp)
target_link_libraries(correctrnc corecode)

file( GLOB TEST_SOURCES tests/*.cpp)
enable_testing(true)
add_executable(unittests ${TEST_SOURCES})
target_link_libraries(unittests corecode)


add_test(NAME RunTests COMMAND unittests)
add_custom_target(check COMMAND ${CMAKE_CTEST_COMMAND} --verbose DEPENDS unittests)
