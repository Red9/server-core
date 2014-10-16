#include "RNCStreamProcessor.hpp"


RNCStreamProcessor::RNCStreamProcessor(){
    next = NULL;
}

void RNCStreamProcessor::setNext(RNCStreamProcessor *next_){
    next = next_;
}

void RNCStreamProcessor::callNext(StreamItem * item){
  if(next != NULL){
      next->process(item);
  }
};
