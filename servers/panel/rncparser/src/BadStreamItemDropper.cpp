#include "BadStreamItemDropper.hpp"


void BadStreamItemDropper::process(StreamItem *item) {
    if (item != NULL) {
        if (item->isValid()) {
            callNext(item);
        } else {
            delete item;
        }
    }

}