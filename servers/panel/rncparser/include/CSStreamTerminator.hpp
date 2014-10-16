#ifndef RED9_SRLM_CSSTREAMTERMINATOR_HPP__
#define RED9_SRLM_CSSTREAMTERMINATOR_HPP__

#include "CSStreamProcessor.hpp"

class CSStreamTerminator : public CSStreamProcessor {
public:
    void process(CrossSection *item);
};

#endif // RED9_SRLM_CSSTREAMTERMINATOR_HPP__