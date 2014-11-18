#include "ExtractHeader.hpp"

void ExtractHeader::extractHeader(const char *endMarker, const int endMarkerLength, rapidjson::Document &d, std::istream *input) {
    char json[10000];
    char *tail = json;

    input->read(tail, endMarkerLength);
    tail += endMarkerLength;

    while (input->good() && memcmp(tail - endMarkerLength, endMarker, endMarkerLength) != 0) {
        input->read(tail, 1);
        tail++;
        // TODO(SRLM): Add in a check to make sure that all the received characters are valid
    }

    // Get rid of the buffer end marker
    tail -= endMarkerLength;
    // And null terminate
    tail[0] = '\0';

    d.Parse(json);
}