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
* @warning: assumes that all RNC strings have dates and times
* @warning: assumes that timestamp format is hhmmss.sss (three decimal seconds!)
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
            //time = -1;
            clear();
        }

        long timeValue;

        enum indexValues_t {
            kIndexLatitude,
            kIndexLongitude,
            kIndexSatellites,
            kIndexHdop,
            kIndexAltitude,
            kIndexSpeed,
            kIndexHeading,
            kIndexValuesLength // Tail marker variable for the end of the enum array
            /*kNmeaEpochTimestamp,*/
        };
        int time; // the time of day, used to determine if we're on a new batch of NMEA strings
        int64_t epochTime; // the calculated time using both the timestamp and the date
        double values[kIndexValuesLength];
        bool dirty[kIndexValuesLength];

        int64_t getEpochTime() {
            return epochTime;
        }

        void clear() {
            for (int i = 0; i < kIndexValuesLength; i++) {
                values[i] = NAN;
                dirty[i] = false;
            }

            time = -1;
            epochTime = -1;
        }


        bool getReady() {
            for (bool i : dirty) {
                if (!i) {
                    return false;
                }
            }
            return true;
        }

        void set(const int index, const double newValue) {
            values[index] = newValue;
            dirty[index] = true;
        }

        double *copyValues() {
            double *resultValues = new double[kIndexValuesLength];
            //memcpy(values, resultValues, sizeof(double) * kValuesLength);
            std::copy(&values[0], &values[kIndexValuesLength], resultValues);
            return resultValues;
        }

        void setEpochTimestamp(char *timestamp, char *date) {
            char epochTimestamp[30]; // Format ddmmyyhhmmss.sss

            memcpy(epochTimestamp, date, 6);
            memcpy(epochTimestamp + 6, timestamp, 10);

            struct tm tm;
            strptime(epochTimestamp, "%d%m%y%H%M%S", &tm);

            epochTime = timegm(&tm);
            epochTime *= 1000;

            // Get the milliseconds in there
            char *temp = epochTimestamp + 6 + 10 - 3;
            epochTime += GPSSensor::readDigitValue(3, temp);
        }
    };

    gpsState state;

    void parseNMEAString(char *data);

    bool validateNMEAString(char *data);

    void parseRMCString(char *data, char *timestamp);

    void parseGGAString(char *data);

    int parseNMEATime(char *timeString);

    double calculateGraticule(char *&base, bool longitude);

    double readValue(char *&data);

    void timeHelper(char *data);

    static int readDigitValue(int digits, char *&data);
};

#endif // RED9_SRLM_GPSSENSOR_HPP__