#ifndef RED9_SRLM_POSTFIXVALIDATOR_HPP__
#define RED9_SRLM_POSTFIXVALIDATOR_HPP__

#include "RNCStreamProcessor.hpp"

class PostfixValidator : public RNCStreamProcessor {
private:
    int validationLength;
    int invalidRemaining;
    int position;
public:
    PostfixValidator(int validationLength_);
    void process(StreamItem *item);
};


#endif // RED9_SRLM_POSTFIXVALIDATOR_HPP__