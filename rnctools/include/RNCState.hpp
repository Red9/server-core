#ifndef RED9_SRLM_RNCSTATE_HPP__
#define RED9_SRLM_RNCSTATE_HPP__

#include <vector>
#include "Sensor.hpp"
#include <math.h>
#include "rapidjson/document.h"

class Sensor;

class RNCState {
public:


    RNCState(unsigned int startCnt_, int64_t baseTime_, int bitsPerTimestamp_, int clkfreq_);

    /**
    * @returns 0 if invalid timestamp, != 0 if valid
    */
    virtual int64_t parseTime(std::istream *input);

    void addSensor(Sensor *sensor);

    Sensor *getSensor(int index);

    Sensor *getSensor(std::string type);

    int sensorsSize();

    void addEpochTime(int64_t scadTime, int64_t gpsTime);

    void printEpochTimes();

    int estimateCorrectedClkfreq(int64_t minimumGPSLockTime);

    int64_t estimateCorrectedBasetime(int64_t fallbackTime);

    static const int64_t kDefaultBaseTime = 0;

    void setDocument(rapidjson::Document * d_);

    rapidjson::Document *getDocument();

private:
    bool upperCnt;
    int cntRollovers;
    unsigned int startCnt;
    int clkfreq;

    int64_t baseTime;

    int bitsPerTimestamp;
    int bytesPerTimestamp;

    unsigned int previousCnt;

    bool firstEpochTime;
    int64_t scadTimes[2];
    int64_t gpsTimes[2];

     rapidjson::Document *d;


    /** Checks to make sure that the CNT is valid by assuming that CNT can differ by, at most, 1 CLKFREQ.
    *
    * If the difference is greater than 1 CLKFREQ then checkCnt returns false (invalid), otherwise true (valid).
    */
    bool checkCnt(unsigned int cnt);

    int64_t cntToMicroseconds(unsigned int cnt);

    std::vector<Sensor *> sensors;


};

#endif // RED9_SRLM_RNCSTATE_HPP__