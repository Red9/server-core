#ifndef RED9_SRLM_BALANCER_HPP__
#define RED9_SRLM_BALANCER_HPP__

#include "RNCStreamProcessor.hpp"
#include <RNCState.hpp>
#include "SensorEstimator.hpp"
#include "CSStreamProcessor.hpp"
#include <CrossSection.hpp>


class Balancer : public RNCStreamProcessor, public CSStreamProcessor {
private:

    std::vector<SensorEstimator *> estimators;

    bool primed;

    bool isPrimed();

    int64_t periodUs;
    int64_t lastCrossSection;

    int64_t alignTimestamp(int64_t timestamp);

public:
    Balancer(RNCState *state_, int64_t periodUs_);

    ~Balancer();

    /**
    *  @warning: when callNext is called the StreamItems may be out of order (non-consecutive)!
    */
    void process(StreamItem *item);

    void process(CrossSection *item);

    int counter;
};


#endif // RED9_SRLM_BALANCER_HPP__