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
}

int64_t RNCState::parseTime(std::istream *input) {
    // TODO: Time size isn't set at 4 bytes. Make configurable
    char binary[4];
    input->read(binary, 4);
    unsigned int clock = (binary[3] & 0xFF) << 24 | (binary[2] & 0xFF) << 16 | (binary[1] & 0xFF) << 8 | (binary[0] & 0xFF);

    if (checkCnt(clock)) {
        int64_t time = cntToMicroseconds(clock);
        return time;// + baseTime;
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

int RNCState::sensorsSize() {
    return sensors.size();
}