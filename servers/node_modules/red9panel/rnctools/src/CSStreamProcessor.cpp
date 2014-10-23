#include "CSStreamProcessor.hpp"

CSStreamProcessor::CSStreamProcessor(){
    next = NULL;
}

void CSStreamProcessor::setNextCS(CSStreamProcessor *next_) {
    next = next_;
}

void CSStreamProcessor::callNext(CrossSection *item) {
    if(next != NULL){
        next->process(item);
    }
}
