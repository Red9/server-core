#include "GPSSensor.hpp"

GPSSensor::GPSSensor(const std::string &name) {
    //TODO: Fill in the axes and units of the Sensor base class here.

    axes.push_back("latitude");
    units.push_back("degrees");
    axes.push_back("longitude");
    units.push_back("degrees");
    axes.push_back("satellites");
    units.push_back("count");
    axes.push_back("hdop");
    units.push_back("m");
    axes.push_back("altitude");
    units.push_back("m");
    axes.push_back("speed");
    units.push_back("m/s");
    axes.push_back("heading");
    units.push_back("degrees");

    for (auto axis : axes) {
        labels.push_back(name + ":" + axis);
    }

    state.clear();
}

bool GPSSensor::canParse(const unsigned char c) {
    return c == identifier;
}

bool GPSSensor::timeHelper(char *data) {
    int newTime = parseNMEATimeHash(data);
    if (newTime != state.time) {
        state.clear();
        state.time = newTime;
    }
}

void GPSSensor::parseNMEAString(char *data) {
    int kTimeOffset = 7;
    int kDataOffset = kTimeOffset + 11;

    if (strncmp(data, "$GPGGA", 6) == 0) {
        timeHelper(data + kTimeOffset);
        parseGGAString(data + kDataOffset);
    } else if (strncmp(data, "$GPRMC", 6) == 0) {
        timeHelper(data + kTimeOffset);
        parseRMCString(data + kDataOffset);
    } else {

    }
}

double GPSSensor::calculateGraticule(char *&base, bool longitude) {
    //Graticule == latitude - longitude
    //N is positive, E is positive
    // NMEA format is DDMM.MMMM for latitude and DDDMM.MMMM for longitude.

    // Test to see if there is no lock at all
    if (*base == ',') {
        base++; // Get past the position number's post comma
        if (*base != ',') {
            base++; // Get past a direction identifier, if specified
        }
        base++; // Get past the direction identifier's post comma
        return NAN;
    }

    // Else, at this point we have a vaild lock.
    int degrees = ((int) base[0] - 0x30) * 10 + ((int) base[1] - 0x30);
    base += 2; // get past the degrees
    if (longitude) { // Longitude is 3 digits for the degrees.
        degrees = degrees * 10 + ((int) base[0]) - 0x30;
        base += 1;
    }
    double minutes = strtod(base, &base); // Remember: modifies base to the next char after the number

    base++; // get past the position's number post comma

    double result = degrees + (minutes / 60);

    if (*base == 'S' || *base == 'W') {
        result = -result;
    }

    base += 2; // get past the direction identifier and it's post comma

    return result;
}

double GPSSensor::readValue(char *&data) {
    double result = NAN;
    if (*data != ',') { // is it not an empty field?
        result = strtod(data, &data);
    }
    data++; // get past the comma
    return result;
}

/**
* $--GGA,hhmmss.ss,llll.ll,a,yyyyy.yy,a,x,xx,x.x,x.x,M,x.x,M,x.x,xxxx
*/
void GPSSensor::parseGGAString(char *data) {

    // The ++s are to get past the commas
    state.set(gpsState::kIndexLatitude, calculateGraticule(data, false));
    state.set(gpsState::kIndexLongitude, calculateGraticule(data, true));

    data += 2; // ignore GPS fix

    state.set(gpsState::kIndexSatellites, readValue(data));
    state.set(gpsState::kIndexHdop, readValue(data));
    double altitude = readValue(data);
    data += 2; // get rid of the altitude units, assume meters

    double geoidSeparation = readValue(data);
    data += 2; // get rid of the geoidSeparation units, assume meters

    state.set(gpsState::kIndexAltitude, altitude - geoidSeparation);
}

/**
* $GPRMC,hhmmss.ss,A,llll.ll,a,yyyyy.yy,a,x.x,x.x,ddmmyy,x.x,a*hh
*/
void GPSSensor::parseRMCString(char *data) {
    data += 2; // Get past the data status
    state.set(gpsState::kIndexLatitude, calculateGraticule(data, false));
    state.set(gpsState::kIndexLongitude, calculateGraticule(data, true));
    state.set(gpsState::kIndexSpeed, readValue(data));
    state.set(gpsState::kIndexHeading, readValue(data));
}

bool GPSSensor::validateNMEAString(char *data) {
    return true;
}


Element *GPSSensor::parse(RNCState *rncstate, std::istream *input) {

    int streamPosition = input->tellg();

    char identifier = input->get();

    int64_t time = rncstate->parseTime(input);

    char inputString[maximumLength];

    int index = 0;
    for (char byte = input->get(); byte != '\0' && index < maximumLength; byte = input->get()) {
        inputString[index++] = byte;
    }
    inputString[index++] = '\0';

    if (time == 0) {
        return new Element(this, time, NULL, streamPosition, new std::string("Invalid timestamp"));
    } else if (validateNMEAString(inputString)) {
        parseNMEAString(inputString);
        if (state.valid()) {
            return new Element(this, time, state.copyValues(), streamPosition);
        } else {
            return NULL;
        }
    } else {
        return NULL;
    }
}

int GPSSensor::parseNMEATimeHash(char *timeString) {
    int first = strtol(timeString, &timeString, 10);
    timeString++;
    int second = strtol(timeString, &timeString, 10);
    return first * 1000 + second;
}

bool GPSSensor::allowEmptyValues() {
    return true;
}
