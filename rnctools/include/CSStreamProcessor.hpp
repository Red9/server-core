#ifndef RED9_SRLM_CSSTREAMPROCESSOR_HPP__
#define RED9_SRLM_CSSTREAMPROCESSOR_HPP__

#include <CrossSection.hpp>

class CSStreamProcessor {
private:
    CSStreamProcessor *next;

public:
    CSStreamProcessor();

    virtual void process(CrossSection *item) = 0;

    void setNextCS(CSStreamProcessor *next_);

protected:
    void callNext(CrossSection *item);
};


#endif // RED9_SRLM_CSSTREAMPROCESSOR_HPP__
