#include <iostream>
#include <RNCStreamPrinter.hpp>
#include <RNCReader.hpp>
#include <PostfixValidotor.hpp>
#include <PrefixValidator.hpp>
#include <BadStreamItemDropper.hpp>
#include <Balancer.hpp>
#include "CSVPrinter.hpp"
#include <unistd.h>
#include <RNCStreamTerminator.hpp>
#include <CSStreamTerminator.hpp>
#include <JSONPanel.hpp>
#include <JSONProperties.hpp>
#include <StatisticsGPSPath.hpp>
#include "TimeWindow.hpp"
#include "StatisticsSimple.hpp"
#include "ezOptionParser.hpp"

#include "StatisticsGPSPath.hpp"
#include "JSONOutputHolder.hpp"

#include "JSONGPS.hpp"

void Usage(ez::ezOptionParser &opt) {
    std::string usage;
    opt.getUsage(usage);
    std::cout << usage;
};


void buildOptions(ez::ezOptionParser &opt) {
    opt.overview = "\nIntelligent parser for RNC binary files. Multiple JSON outputs can be specified, in which case the results are output as a single JSON object.";
    opt.footer = "rncprocessor 0.0.1 Copyright (C) 2014 Red9\n\n";

    opt.add(
            "", // Default.
            0, // Required?
            0, // Number of args expected.
            0, // Delimiter if expecting multiple args.
            "Display usage instructions.", // Help description.
            "-h",     // Flag token.
            "-help",  // Flag token.
            "--help", // Flag token.
            "--usage" // Flag token.
    );

    opt.add(
            "", // Default
            1, // Required
            1, // Number of args expected
            0, // Delimiter if expecting multiple args
            "Path to input file.", // Help description
            "--inputFile"
    );

    opt.add(
            "",
            0,
            1,
            0,
            "Cross section period (NOT frequency) in milliseconds. For example, an input of '10' is 100Hz, while an input of '1' is 1000Hz.",
            "--csPeriod"
    );

    opt.add(
            "",
            0,
            1,
            0,
            "Number of rows to output (approximate). --csPeriod is automatically calculated. If specified --startTime and --endTime must also be provided.",
            "--rows"
    );

    opt.add(
            "",
            0,
            0,
            0,
            "Output the results as a CSV. Must not specify a JSON option",
            "--csvOutput"
    );

    opt.add(
            "",
            0,
            0,
            0,
            "JSON output, include panel. Must not specify CSV option.",
            "--jsonPanel"
    );

    opt.add(
            "",
            0,
            0,
            0,
            "JSON output, include basic panel properties.",
            "--jsonProperties"
    );

    opt.add(
            "",
            0,
            0,
            0,
            "JSON output, includes panel statistics",
            "--jsonStatistics"
    );

    opt.add(
            "",
            0,
            1,
            0,
            "Only include results with timestamps after this time. Either both --startTime and --endTime should be specified, or neither.",
            "--startTime"
    );

    opt.add(
            "",
            0,
            1,
            0,
            "Only include results with timestamps before this time. Either both --startTime and --endTime should be specified, or neither.",
            "--endTime"
    );

    opt.add(
            "",
            0,
            2,
            ',',
            "Specify filters for an XYZ axis. First argument is the measurement type, then 1 numbers (which is applied to each axis). Uses sensor name! Example: '--filter accelerometer,0.21'",
            "--filter"
    );

    /*opt.add(
            "", // Default
            1, // Required
            1, // Number of args expected
            0, // Delimiter if expecting multiple args
            "Path to input file.", // Help description
            "-i",
            "--inputFile"
    );*/
}

int64_t getTimestampFromOpt(ez::ezOptionParser &opt, std::string key) {
    assert(sizeof(long long) == 8);
    long long t;
    opt.get(key.c_str())->getLongLong(t);
    // Multiply by 1000 to get from milliseconds to microseconds
    return (int64_t) t * 1000;
}

int parserBoilerplate(ez::ezOptionParser &opt) {
    if (opt.isSet("-h")) {
        Usage(opt);
        return 1;
    }

    std::vector<std::string> badOptions;
    if (!opt.gotRequired(badOptions)) {
        for (unsigned int i = 0; i < badOptions.size(); ++i) {
            std::cerr << "ERROR: Missing required option " << badOptions[i] << ".\n\n";
        }
        return 1;
    }

    if (!opt.gotExpected(badOptions)) {
        for (unsigned int i = 0; i < badOptions.size(); ++i) {
            std::cerr << "ERROR: Got unexpected number of arguments for option " << badOptions[i] << ".\n\n";
        }
        return 1;
    }

    if (opt.isSet("--csvOutput")
        && (opt.isSet("--jsonPanel")
            || opt.isSet("--jsonProperties")
            || opt.isSet("--jsonStatistics"))) {
        std::cerr << "ERROR: May not specify both CSV output and JSON output." << std::endl << std::endl;
        return 1;
    }

    if (!(opt.isSet("--csvOutput")
          || opt.isSet("--jsonPanel")
          || opt.isSet("--jsonProperties")
          || opt.isSet("--jsonStatistics"))) {
        std::cerr << "ERROR: Must specify at least one output type." << std::endl << std::endl;
        return 1;
    }

    if ((opt.isSet("--startTime") && !opt.isSet("--endTime"))
        || (!opt.isSet("--startTime") && opt.isSet("--endTime"))) {
        std::cerr << "ERROR: Must specify both --startTime and --endTime." << std::endl << std::endl;
        return 1;
    }

    if (opt.isSet("--startTime") && opt.isSet("--endTime")
        && getTimestampFromOpt(opt, "--startTime") >= getTimestampFromOpt(opt, "--endTime")) {
        std::cerr << "ERROR: --startTime must be less than --endTime." << std::endl << std::endl;
        return 1;
    }

    if (opt.isSet("--csPeriod") && opt.isSet("--rows")) {
        std::cerr << "ERROR: must at most one of --csPeriod or --rows." << std::endl << std::endl;
        return 1;
    }

    if ((opt.isSet("--jsonPanel") || opt.isSet("--csvOutput"))
        && !(opt.isSet("--csPeriod") || opt.isSet("--rows"))) {
        std::cerr << "ERROR: must specify --csPeriod or --rows when using cross sections." << std::endl << std::endl;
        return 1;
    }

    if (opt.isSet("--rows") && !(opt.isSet("--startTime") && opt.isSet("--endTime"))) {
        std::cerr << "ERROR: must specify --startTime and --endTime if --rows is specified." << std::endl << std::endl;
        return 1;
    }

    return 0;
}

int main(int argc, const char *argv[]) {
    ez::ezOptionParser opt;
    buildOptions(opt);
    opt.parse(argc, argv);
    int returnValue = parserBoilerplate(opt);
    if (returnValue != 0) {
        return returnValue;
    }

    std::string inputFilename;
    opt.get("--inputFile")->getString(inputFilename);


    int64_t csPeriod = 0;
    if (opt.isSet("--csPeriod")) {
        csPeriod = getTimestampFromOpt(opt, "--csPeriod");
    } else if (opt.isSet("--startTime") && opt.isSet("--endTime") && opt.isSet("--rows")) {
        int rows;
        opt.get("--rows")->getInt(rows);
        csPeriod = (getTimestampFromOpt(opt, "--endTime") - getTimestampFromOpt(opt, "--startTime")) / rows;
    } else {
        // Nothing .If we get to this point then we don't actually need the csPeriod
    }

    std::map<std::string, double> filters;

    if (opt.isSet("--filter")) {
        std::vector<std::vector<std::string> > filtersRaw;
        opt.get("--filter")->getMultiStrings(filtersRaw);

        for (auto &rawFilter : filtersRaw) {
            std::string type = rawFilter[0];

            double alpha = stod(rawFilter[1]);

            filters.insert({type, alpha});
        }
    }


    RNCReader reader(inputFilename);
    RNCState *state = reader.processHeader(filters);

    PrefixValidator prefix(3);
    PostfixValidator postfix(3);
    RNCStreamPrinter printer(0);
    BadStreamItemDropper dropper;

    reader.setNext(&prefix);
    prefix.setNext(&postfix);
    postfix.setNext(&printer);
    printer.setNext(&dropper);
    RNCStreamProcessor *lastRNCProcessor = &dropper;

    if (opt.isSet("--startTime") && opt.isSet("--endTime")) {
        TimeWindow *window = new TimeWindow(getTimestampFromOpt(opt, "--startTime"),
                                            getTimestampFromOpt(opt, "--endTime"));
        lastRNCProcessor->setNext(window);
        lastRNCProcessor = window;
    }

    // At this point CSV and JSON must be exclusive.
    if (opt.isSet("--csvOutput")) {
        Balancer balancer(state, csPeriod);
        lastRNCProcessor->setNext(&balancer); // Hook it up here, but we can always override it below.
        lastRNCProcessor = &balancer;

        // Using this variable allows us to add an arbitrary number of items to the processing pipeline.
        CSStreamProcessor *lastCSProcessor = &balancer;


        CSVPrinter csvPrinter(false);
        lastCSProcessor->setNextCS(&csvPrinter);
        lastCSProcessor = &csvPrinter;
        CSStreamTerminator csTerminator;
        lastCSProcessor->setNextCS(&csTerminator);
        lastCSProcessor = &csTerminator;

        RNCStreamTerminator rncterminator;
        lastRNCProcessor->setNext(&rncterminator);


        reader.processBody(state);
    } else { // JSON Property set

        std::vector<JSONOutput *> outputs;
        if (opt.isSet("--jsonStatistics")) {
            JSONOutputHolder *summaryStatistics = new JSONOutputHolder("summaryStatistics");
            outputs.push_back(summaryStatistics);

            Sensor *gps = state->getSensor("gps");
            StatisticsGPSPath *sGPS = new StatisticsGPSPath(gps);
            summaryStatistics->add(sGPS);
            lastRNCProcessor->setNext(sGPS);
            lastRNCProcessor = sGPS;

            StatisticsSimple *ssGPS = new StatisticsSimple(gps, false);
            summaryStatistics->add(ssGPS);
            lastRNCProcessor->setNext(ssGPS);
            lastRNCProcessor = ssGPS;


            Sensor *accl = state->getSensor("accelerometer");
            StatisticsSimple *ssAccl = new StatisticsSimple(accl, true);
            summaryStatistics->add(ssAccl);
            lastRNCProcessor->setNext(ssAccl);
            lastRNCProcessor = ssAccl;

            Sensor *gyro = state->getSensor("gyroscope");
            StatisticsSimple *ssGyro = new StatisticsSimple(gyro, false);
            summaryStatistics->add(ssGyro);
            lastRNCProcessor->setNext(ssGyro);
            lastRNCProcessor = ssGyro;

            Sensor *magn = state->getSensor("magnetometer");
            StatisticsSimple *ssMagn = new StatisticsSimple(magn, false);
            summaryStatistics->add(ssMagn);
            lastRNCProcessor->setNext(ssMagn);
            lastRNCProcessor = ssMagn;
            //lastRNCProcessor->setNext(&balancer);
        }


        if (opt.isSet("--jsonProperties")) {
            // This must be after the CS time window
            JSONProperties *properties = new JSONProperties(state->getDocument());
            outputs.push_back(properties);
            lastRNCProcessor->setNext(properties);
            lastRNCProcessor = properties;

            Sensor *gps = state->getSensor("gps");
            JSONGPS *jsongps = new JSONGPS(gps);
            outputs.push_back(jsongps);
            lastRNCProcessor->setNext(jsongps);
            lastRNCProcessor = jsongps;


            //lastRNCProcessor->setNext(&balancer);

        }


        if (opt.isSet("--jsonPanel")) {
            Balancer *balancer = new Balancer(state, csPeriod);
            lastRNCProcessor->setNext(balancer); // Hook it up here, but we can always override it below.
            lastRNCProcessor = balancer;
            // Using this variable allows us to add an arbitrary number of items to the processing pipeline.
            CSStreamProcessor *lastCSProcessor = balancer;

            JSONPanel *jsonPanel = new JSONPanel;
            lastCSProcessor->setNextCS(jsonPanel);
            lastCSProcessor = jsonPanel;
            outputs.push_back(jsonPanel);

            CSStreamTerminator *csTerminator = new CSStreamTerminator;
            lastCSProcessor->setNextCS(csTerminator);
        }

        RNCStreamTerminator rncterminator;
        lastRNCProcessor->setNext(&rncterminator);

        reader.processBody(state);

        rapidjson::StringBuffer s;
        rapidjson::Writer<rapidjson::StringBuffer> writer(s);

        writer.StartObject();
        for (auto output : outputs) {
            output->writeResults(writer);
        }
        writer.EndObject();

        std::cout << s.GetString() << std::endl;
    }


    return 0;
}