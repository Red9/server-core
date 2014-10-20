#ifndef RED9_SRLM_PREFIXVALIDATOR_HPP__
#define RED9_SRLM_PREFIXVALIDATOR_HPP__

#include <queue>
#include "RNCStreamProcessor.hpp"


class PrefixValidator : public RNCStreamProcessor {
private:
    int validationLength;
    std::queue<StreamItem *> buffer;

    void setInvalid(StreamItem *item, int invalidationPosition);

public:
    PrefixValidator(int validationLength_);

    void process(StreamItem *item);

};


#endif // RED9_SRLM_PREFIXVALIDATOR_HPP__