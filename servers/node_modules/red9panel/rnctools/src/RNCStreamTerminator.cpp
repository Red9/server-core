#include "RNCStreamTerminator.hpp"

void RNCStreamTerminator::process(StreamItem * item) {
    if (item != NULL) {
        delete item;
    }
}