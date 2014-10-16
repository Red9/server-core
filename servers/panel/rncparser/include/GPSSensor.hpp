#ifndef RED9_SRLM_GPSSENSOR_HPP__
#define RED9_SRLM_GPSSENSOR_HPP__

#include "Sensor.hpp"
#include "RNCState.hpp"
#include "Element.hpp"

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>


/**
* The two GPS strings that we care about:
* - GGA
*   - Latitude
*   - Longitude
*   - Satellite count
*   - HDOP
*   - Altitude (+ geoidal separation)
* - RMC
*   - Latitude
*   - Longitude
*   - Speed
*   - Heading
*
*
*/

class GPSSensor : public Sensor {
public:
    int frequency;

    // 1 identifier + 4 time bytes + 80 NMEA characters + 1 \0
    static const int maximumLength = 1 + 4 + 80 + 1;

    GPSSensor(const std::string &name);

    bool canParse(const unsigned char c);

    Element *parse(RNCState *state, std::istream *input);

    bool allowEmptyValues();


private:


    // Scope the enums with a struct. Don't use enum class since we need
    // the integer index.
    struct gpsState {
        gpsState() {
            time = -1;
            clear();
        }

        enum indexValues_t {
            kIndexLatitude,
            kIndexLongitude,
            kIndexSatellites,
            kIndexHdop,
            kIndexAltitude,
            kIndexSpeed,
            kIndexHeading,
            kIndexValuesLength // the calculated epoch time of these values
            /*kNmeaEpochTimestamp,*/
        };
        int time;
        double values[kIndexValuesLength];

        void clear() {
            for (int i = 0; i < kIndexValuesLength; i++) {
                values[i] = NAN;
            }
        }

        bool valid() {
            for (int i = 0; i < kIndexValuesLength; i++) {
                if (isnan(values[i])) {
                    return false;
                }
            }
            return true;
        }

        void set(const int index, const double newValue) {
            values[index] = newValue;
        }

        double *copyValues() {
            double *resultValues = new double[kIndexValuesLength];
            //memcpy(values, resultValues, sizeof(double) * kValuesLength);
            std::copy(&values[0], &values[kIndexValuesLength], resultValues);
            return resultValues;
        }
    };

    gpsState state;

    void parseNMEAString(char *data);

    bool validateNMEAString(char *data);

    void parseRMCString(char *data);

    void parseGGAString(char *data);

    int parseNMEATimeHash(char *timeString);

    double calculateGraticule(char *&base, bool longitude);

    double readValue(char *&data);

    bool timeHelper(char *data);

};

#endif // RED9_SRLM_GPSSENSOR_HPP__