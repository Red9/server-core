#ifndef RED9_SRLM_CSSTREAMPRINTER_HPP__
#define RED9_SRLM_CSSTREAMPRINTER_HPP__

#include <iostream>
#include <CrossSection.hpp>
#include <CSStreamProcessor.hpp>


class CSVPrinter : public CSStreamProcessor {
private:
    bool printHeader;
    bool pretty;
public:
    CSVPrinter(bool pretty_);
    void process(CrossSection *item);


    int counter;
};


#endif // RED9_SRLM_CSSTREAMPRINTER_HPP__