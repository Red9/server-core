#ifndef RED9_SRLM_RNCSTREAMPRINTER_HPP__
#define RED9_SRLM_RNCSTREAMPRINTER_HPP__

#include "RNCStreamProcessor.hpp"

class RNCStreamPrinter : public RNCStreamProcessor {
    int columnWidth;
    int currentColumn;
public:
    /**
    * columnWidth_ set to 0 to disable
    */
    RNCStreamPrinter(int columnWidth_);

    void process(StreamItem *item);
};


#endif // RED9_SRLM_RNCSTREAMPRINTER_HPP__