#include "TimeWindow.hpp"

TimeWindow::TimeWindow(int64_t startTime_, int64_t endTime_) {
    startTime = startTime_;
    endTime = endTime_;
}

void TimeWindow::process(StreamItem *item) {
    Element *item_ = (Element *) item;
    item_->setInWindow(startTime <= item_->getTimestamp() && item_->getTimestamp() <= endTime);
    callNext(item);
}
