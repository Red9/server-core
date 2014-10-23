#include "PostfixValidotor.hpp"

PostfixValidator::PostfixValidator(int validationLength_){
    validationLength = validationLength_;
    invalidRemaining = 0;
}


void PostfixValidator::process(StreamItem *item){
    if(!item->isValid()){
        invalidRemaining = validationLength;
        position = item->getPosition();
    }else if(invalidRemaining > 0){
        invalidRemaining --;
        std::ostringstream t;
        t << "Postfix invaldation by marker at 0x" << std::hex << std::setw(8) << std::setfill('0') << position;
        item->setValid(false, new std::string(t.str()));
    }
    callNext(item);
}