#include "RNCReader.hpp"

const char RNCReader::bufferEnd[] = "||||||||";

Sensor *RNCReader::parseSensor(const std::string &name, const rapidjson::Value &description,
                               double filter) {
    Sensor *result;

    std::string measurementName = measurementNameMap[name];


    if (description["processor"].HasMember("numbers")) {
        NumberSensor *t = new NumberSensor;
        t->bitsPerAxis = description["processor"]["numbers"]["bitsPerAxis"].GetInt();
        t->bytesPerAxis = t->bitsPerAxis / 8;
        t->scalable = description["processor"]["numbers"]["scalable"].GetBool();

        for (rapidjson::Value::ConstValueIterator itr = description["processor"]["numbers"]["axes"].Begin();
             itr != description["processor"]["numbers"]["axes"].End();
             ++itr) {
            std::string axis = itr->GetString();
            t->axes.push_back(axis);
            t->scale.push_back(1.0);

            t->labels.push_back(measurementName + ":" + axis);

            if (isnan(filter) == false) {
                //std::cout << "Adding filter for " << axis << " with value " << filter << std::endl;
                t->filters.push_back(FilterExponentialMovingAverage(filter));
            }
        }

        for (rapidjson::Value::ConstValueIterator itr = description["processor"]["numbers"]["units"].Begin();
             itr != description["processor"]["numbers"]["units"].End();
             ++itr) {
            t->units.push_back(itr->GetString());
        }

        if (measurementName == "acceleration") {
            t->magnitudable = true;
            t->axes.push_back("magnitude");
            t->labels.push_back(measurementName + ":magnitude");
            t->units.push_back(t->units[0]); // Hacky!
        }


        result = t;
    } else if (description["processor"].HasMember("gpsString")) {
        GPSSensor *t = new GPSSensor(measurementName);
        t->frequency = description["processor"]["gpsString"]["frequency"].GetInt();
        result = t;
    } else {
        throw new std::runtime_error("Sensor Type unsupported");
    }

    result->measurementName = measurementName;
    result->longName = name;
    result->identifier = description["id"].GetString()[0];
    result->shortName = description["name"].GetString();

    //printf("%s (%c), %X\n", result->longName.c_str(), result->identifier, result->identifier | 0x80);

    return result;
}

RNCState *RNCReader::parseHeader(rapidjson::Document &header,
                                 std::map<std::string, double> filters) {
    int clkfreq = header["timestampFormat"]["frequency"].GetInt();
    int bitsPerTimestamp = header["timestampFormat"]["bitsPerTimestamp"].GetInt();

    std::string temp = header["createTime"]["timestamp"].GetString();
    unsigned int startCnt = strtoul(temp.c_str(), NULL, 16);

    int64_t baseTime = RNCState::kDefaultBaseTime; // Default
    std::string createTimeString = header["createTime"]["brokenTime"].GetString();
    struct tm timeDate;
    if (strptime(createTimeString.c_str(), "%FT%T%z", &timeDate) != NULL) {
        baseTime = timegm(&timeDate);
        baseTime = baseTime * 1000 * 1000; // Convert to microseconds
    }

    RNCState *state = new RNCState(startCnt, baseTime, bitsPerTimestamp, clkfreq);

    for (rapidjson::Value::ConstMemberIterator sensor = header["sensors"].MemberBegin();
         sensor != header["sensors"].MemberEnd();
         ++sensor) {

        double filter = NAN;
        if (filters.count(measurementNameMap[sensor->name.GetString()]) > 0) {
            filter = filters[measurementNameMap[sensor->name.GetString()]];
        }

        state->addSensor(parseSensor(sensor->name.GetString(), sensor->value, filter));
    }

    return state;
}


RNCReader::RNCReader(std::string filename_) {
    filename = filename_;
    rnc = NULL;

    measurementNameMap["gyroscope"] = "rotationrate";
    measurementNameMap["accelerometer"] = "acceleration";
    measurementNameMap["barometer"] = "pressure";
    measurementNameMap["magnetometer"] = "magneticfield";
    measurementNameMap["gps"] = "gps";
}

RNCReader::~RNCReader() {
    // TODO(SRLM): Should we close the file here?
    delete rnc;
    rnc = NULL;
}


RNCState *RNCReader::processHeader(std::map<std::string, double> filters) {
    rnc = new std::ifstream(filename, std::ios::in | std::ios::binary);
    if (!rnc->good()) {
        throw std::runtime_error("Input file not good");
    }

    rapidjson::Document *d = new rapidjson::Document;
    ExtractHeader::extractHeader("||||||||", 8, *d, rnc);

    RNCState *state = parseHeader(*d, filters);
    state->setDocument(d);

    if (!rnc->good()) {
        throw std::runtime_error("Input file not good after reading the header");
    }
    return state;
}

void RNCReader::processBody(RNCState *state) {
    while (true) {
        if (!rnc->good() || rnc->peek() == EOF) {
            break;
        }


        unsigned char nextIdentifier = rnc->peek();

        bool foundParser = false;
        for (int index = 0; index < state->sensorsSize(); index++) {
            auto sensor = state->getSensor(index);
            if (sensor->canParse(nextIdentifier)) {
                foundParser = true;
                Element *t = sensor->parse(state, rnc);
                if (t != NULL) {
                    if (!t->isValid()) {
                        //std::cout << "Invalid Element, time " << (((double)t->getTimestamp())/1000000.0) << ": " << t->getErrorMessage() << std::endl;
                    } else if (t->getSensor()->identifier == 'A') {
                        //printf("ACCL(0x%X): %f, %f, %f\n", t->getPosition(), (*t)[0], (*t)[1], (*t)[2]);
                    }
                    callNext(t);
                }
                // Regardless of whether or not the Element was NULL, we processed the input. Skip to next.
                break;
            }
        }

        if (foundParser == false) {

            std::ostringstream message;
            message << "Did not find parser for byte 0x" << std::hex << std::setw(2) << std::setfill('0') <<
            (int) nextIdentifier;
            StreamItem *temp = new StreamItem(rnc->tellg(), false, new std::string(message.str()));
            //std::cout << "Warning: " << temp->getErrorMessage() << std::endl;

            //     printer.process(temp);
            // Get rid of the byte from the input stream

            callNext(temp);
            rnc->get();
        }
    }
    rnc->close();
}


void RNCReader::process(StreamItem *item) {
    // Do nothing, since this is the class that generates the the StreamItems.
}