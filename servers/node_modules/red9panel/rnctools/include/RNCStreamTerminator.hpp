#ifndef RED9_SRLM_RNCSTREAMTERMINATOR_HPP__
#define RED9_SRLM_RNCSTREAMTERMINATOR_HPP__

#include "RNCStreamProcessor.hpp"

class RNCStreamTerminator : public RNCStreamProcessor {
public:
    void process(StreamItem *item);
};

#endif // RED9_SRLM_RNCSTREAMTERMINATOR_HPP__