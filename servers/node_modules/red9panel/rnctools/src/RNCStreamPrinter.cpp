#include "RNCStreamPrinter.hpp"

RNCStreamPrinter::RNCStreamPrinter(int columnWidth_) {
    columnWidth = columnWidth_;
    currentColumn = 0;
}


void RNCStreamPrinter::process(StreamItem *item) {


    if (columnWidth > 0) {
        if (currentColumn == 0) {
            std::ostringstream message;
            message << std::endl << "0x" << std::hex << std::setw(8) << std::setfill('0') << item->getPosition() << "| ";
            std::cout << message.str();
            currentColumn = 0;
        }

        char c = item->isValid() ? 'v' : 'X';
        std::cout << c;
        currentColumn++;

        if (currentColumn == columnWidth) {
            currentColumn = 0;
        }
    }


    callNext(item);
}