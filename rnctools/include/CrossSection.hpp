#ifndef RED9_SRLM_CROSSSECTION_HPP__
#define RED9_SRLM_CROSSSECTION_HPP__

#include <stdlib.h>
#include <string>
#include <map>

class CrossSection {
private:
    std::map<std::string, double> data;
    int64_t timestamp;

public:

    CrossSection(int64_t timestamp_);

    void addValue(std::string label, double value);

    std::map<std::string, double> getData();

    int64_t getTime();
};


#endif // RED9_SRLM_CROSSSECTION_HPP__