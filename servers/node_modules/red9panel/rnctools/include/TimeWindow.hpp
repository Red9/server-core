#ifndef RED9_SRLM_TIMEWINDOW_HPP__
#define RED9_SRLM_TIMEWINDOW_HPP__

#include <limits>
#include "RNCStreamProcessor.hpp"
#include "Element.hpp"

class TimeWindow : public RNCStreamProcessor {
private:
    int64_t startTime;
    int64_t endTime;
public:
    TimeWindow(int64_t startTime_, int64_t endTime_);

    void process(StreamItem *item);
};


#endif // RED9_SRLM_TIMEWINDOW_HPP__