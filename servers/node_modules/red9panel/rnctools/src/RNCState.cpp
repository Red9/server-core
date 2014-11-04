#include "RNCState.hpp"

RNCState::RNCState(unsigned int startCnt_,
        int64_t baseTime_,
        int bitsPerTimestamp_,
        int clkfreq_) {
    startCnt = startCnt_;
    previousCnt = startCnt;
    if (startCnt > 0x7fffFfffL) {     //Halfway to rolling over
        upperCnt = true;
    } else {
        upperCnt = false;
    }

    baseTime = baseTime_;

    bitsPerTimestamp = bitsPerTimestamp_;
    bytesPerTimestamp = bitsPerTimestamp / 8;

    clkfreq = clkfreq_;

    cntRollovers = 0;

    firstEpochTime = true;
    scadTimes[0] = scadTimes[1] = gpsTimes[0] = gpsTimes[1] = NAN;
}

int64_t RNCState::parseTime(std::istream *input) {
    // TODO: Time size isn't set at 4 bytes. Make configurable
    char binary[4];
    input->read(binary, 4);
    unsigned int clock = (binary[3] & 0xFF) << 24 | (binary[2] & 0xFF) << 16 | (binary[1] & 0xFF) << 8 | (binary[0] & 0xFF);

    if (checkCnt(clock)) {
        int64_t time = cntToMicroseconds(clock);
        return time + baseTime;
    } else {
        return 0;
    }
}

bool RNCState::checkCnt(unsigned int cnt) {
    if ((cnt - previousCnt) > clkfreq) {
        return false;
    } else {
        previousCnt = cnt;
        return true;
    }
}

int64_t RNCState::cntToMicroseconds(unsigned int cnt) {
    //Todo(SRLM): there is a bug here:
    //This function tracks the number of rollovers in the cnts given to it.
    //If a bad cnt is read, and given, it could indicate a rollover when
    //really that cnt should be ignored. Example cnt list:
    // 0x71231234 upperCnt = false
    // 0x80000000 upperCnt = true;
    // 0x82535676 upperCnt = true;
    // 0x00357324 upperCnt = false; <-Bad reading, incorrectly indicates rollover
    // 0x89723454 upperCnt = true;
    // 0x90736756 upperCnt = true;
    // ***possible solution: store the previous CNT, and if it differs by more
    // than 1 second (or whatever), throw error/return -1.
    // ***possible improvement: instead of using 0x7fffFfffL, which leaves
    // open a 50% window that a bad reading will come in below, use a much
    // smaller number. That will reduce that chance that a random number
    // will be mistaken as a "rollover".

    if (cnt < 0x7fffFfff && upperCnt == true) {// Just rolled over 32 bit counter
        cntRollovers++;
        upperCnt = false;
    }

    if (cnt > 0x7fffFfff) {                    //Halfway to rolling over
        upperCnt = true;
    }

    int64_t ticks = cnt + (0xFfffFfffl * cntRollovers) - startCnt;

    return ticks * 1000000 / clkfreq;
}

void RNCState::addSensor(Sensor *sensor) {
    sensors.push_back(sensor);
}

Sensor *RNCState::getSensor(int index) {
    return sensors[index];
}

Sensor *RNCState::getSensor(std::string type) {
    for (auto sensor : sensors) {
        if (type.compare(sensor->longName) == 0
                || type.compare(sensor->shortName) == 0) {
            return sensor;
        }
    }
    return nullptr;
}

int RNCState::sensorsSize() {
    return sensors.size();
}

void RNCState::setDocument(rapidjson::Document *d_) {
    d = d_;
}

rapidjson::Document * RNCState::getDocument(){
    return d;
}

void RNCState::addEpochTime(int64_t scadTime, int64_t gpsTime) {
    if (firstEpochTime) {
        scadTimes[0] = scadTime;
        gpsTimes[0] = gpsTime;
        firstEpochTime = false;
    }

    scadTimes[1] = scadTime;
    gpsTimes[1] = gpsTime;
}

int64_t RNCState::estimateCorrectedBasetime(int64_t fallbackTime) {
    if (isnan(gpsTimes[0]) || isnan(scadTimes[0])) {
        // No GPS time
        if (baseTime != kDefaultBaseTime) {
            // We don't have GPS time, but the RNC had a valid time. So, let's use that.
            return baseTime;
        } else {
            // We don't really know what time it is at all, so we'll just have to use some "random" time.
            return fallbackTime;
        }
    } else {
        return gpsTimes[0] * 1000 // The known truth, in microseconds
                - (scadTimes[0] - baseTime); // The time since recording started
    }
}

int RNCState::estimateCorrectedClkfreq(int64_t minimumGPSLockTime) {
    int64_t scadDelta = scadTimes[1] - scadTimes[0];
    int64_t gpsDelta = (gpsTimes[1] - gpsTimes[0]) * 1000; // express in microseconds
    int64_t deltaDelta = gpsDelta - scadDelta;

    if (scadDelta < minimumGPSLockTime) {
        return clkfreq;
    } else {
        double ratio = 1 - ((double) deltaDelta / scadDelta);
        int result = (int) (clkfreq * ratio);
        return result;
    }
}

void RNCState::printEpochTimes() {
    // SCAD times are in micro seconds!

    int64_t scadDelta = ((scadTimes[1] - scadTimes[0]) / 1000);
    int64_t gpsDelta = (gpsTimes[1] - gpsTimes[0]);
    int64_t deltaDelta = gpsDelta - scadDelta;

    double ratio = 1 - ((double) deltaDelta / scadDelta);

    std::cout << "scad: " << (scadTimes[0] / 1000) << "," << (scadTimes[1] / 1000) << ", delta " << scadDelta << std::endl;
    std::cout << "gps: " << gpsTimes[0] << "," << gpsTimes[1] << ", delta " << gpsDelta << std::endl;
    std::cout << "gpsDelta - scadDelta: " << deltaDelta << std::endl;
    std::cout << "gps duration, minutes: " << ((double) gpsDelta) / 1000.0 / 60.0 << std::endl;
    std::cout << "clkfreq: " << clkfreq << std::endl;
    printf("ratio: %1.8f\n", ratio);
    //std::cout << "ratio: " << ratio << std::endl;
    std::cout << "adjusted clkfreq: " << (int64_t) (clkfreq * ratio) << std::endl;
}