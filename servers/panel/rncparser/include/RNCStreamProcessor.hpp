#ifndef RED9_SRLM_RNCSTREAMPROCESSOR_HPP__
#define RED9_SRLM_RNCSTREAMPROCESSOR_HPP__

#include <iostream>
#include "StreamItem.hpp"

class RNCStreamProcessor {
private:
    RNCStreamProcessor *next;

public:
    RNCStreamProcessor();

    virtual void process(StreamItem *item) = 0;

    void setNext(RNCStreamProcessor *next_);

protected:
    void callNext(StreamItem * item);
};


#endif // RED9_SRLM_RNCSTREAMPROCESSOR_HPP__