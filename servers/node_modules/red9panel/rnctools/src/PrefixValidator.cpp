#include "PrefixValidator.hpp"


PrefixValidator::PrefixValidator(int validationLength_) {
    validationLength = validationLength_;
}

void PrefixValidator::setInvalid(StreamItem *item, int invalidationPosition) {
    item->setValid(false, new std::string("Prefix validator invalidation"));
}

void PrefixValidator::process(StreamItem *item) {
    if(validationLength <= 0){
        callNext(item);
    }else {
        if (!item->isValid()) {
            while (!buffer.empty()) {
                StreamItem *t = buffer.front();
                setInvalid(t, item->getPosition());
                callNext(t);
                buffer.pop();
            }
            callNext(item);
        } else {
            if (buffer.size() == (unsigned) validationLength) {
                callNext(buffer.front());
                buffer.pop();
            }
            buffer.push(item);
        }
    }


}