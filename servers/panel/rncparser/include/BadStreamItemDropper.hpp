#include "RNCStreamProcessor.hpp"

#ifndef RED9_SRLM_BADSTREAMITEMDROPPER_HPP__
#define RED9_SRLM_BADSTREAMITEMDROPPER_HPP__

class BadStreamItemDropper : public RNCStreamProcessor {
private:

public:
    void process(StreamItem *item);
};

#endif // RED9_SRLM_BADSTREAMITEMDROPPER_HPP__