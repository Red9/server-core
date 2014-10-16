#include "CSStreamTerminator.hpp"

void CSStreamTerminator::process(CrossSection *item) {
    if (item != NULL) {
        delete item;
    }
}