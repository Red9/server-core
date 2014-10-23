#include <iomanip>
#include "CSVPrinter.hpp"

CSVPrinter::CSVPrinter(bool pretty_) {
    printHeader = true;
    pretty = pretty_;
    counter = 0;
}

void CSVPrinter::process(CrossSection *item) {
    if (printHeader) {
        std::cout << "row,";
        std::cout << "time";
        for (auto t : item->getData()) {
            std::cout << ',' << t.first;
        }
        std::cout << std::endl;
        printHeader = false;
    }

    std::cout << counter++ << ",";
    std::cout << item->getTime();
    for (auto t : item->getData()) {
        std::cout << ",";
        if (pretty) {
            std::cout << std::setw(13) << std::setfill(' ');
        }
        std::cout << t.second;
    }
    std::cout << std::endl;

    callNext(item);
}