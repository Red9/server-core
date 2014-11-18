#include "StreamItem.hpp"

StreamItem::StreamItem(int position_, bool valid_, std::string *errorMessage_) {
    streamPosition = position_;
    setValid(valid_, errorMessage_);
}

StreamItem::~StreamItem() {
    if(errorMessage != NULL) {
        delete errorMessage;
    }
}

void StreamItem::setValid(bool valid_, std::string *errorMessage_) {
    valid = valid_;
    errorMessage = errorMessage_;
}


bool StreamItem::isValid() {
    return valid;
}


int StreamItem::getPosition() {
    return streamPosition;
}


std::string StreamItem::getErrorMessage() {
    std::ostringstream t;

    t << "(0x" << std::hex << std::setw(8) << std::setfill('0') << streamPosition << "): " << *errorMessage;

    return t.str();
}
