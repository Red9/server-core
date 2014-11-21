#ifndef RED9_SRLM_EXTRACTHEADER_HPP__
#define RED9_SRLM_EXTRACTHEADER_HPP__

#include <rapidjson/document.h>

class ExtractHeader{
public:
    /**
    * Leaves rnc at the start of the binary section.
    */
    static void extractHeader(const char * endMarker, const int endMarkerLength, rapidjson::Document &d, std::istream *rnc);
};

#endif // RED9_SRLM_EXTRACTHEADER_HPP__