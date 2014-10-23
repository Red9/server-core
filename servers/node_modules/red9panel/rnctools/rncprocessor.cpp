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

#include "ezOptionParser.hpp"

void Usage(ez::ezOptionParser &opt) {
    std::string usage;
    opt.getUsage(usage);
    std::cout << usage;
};


void buildOptions(ez::ezOptionParser &opt) {
    opt.overview = "\nIntelligent parser for RNC binary files. Multiple JSON outputs can be specified, in which case the results are output as a single JSON object.";
    opt.footer = "rnc parser 0.0.1 Copyright (C) 2014 Red9\n\n";

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
            "10000",
            1,
            1,
            0,
            "Cross section period (NOT frequency) in microseconds. For example, an input of '10000' is 100Hz, while an input of '1000' is 1000Hz.",
            "--csPeriod"
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

int parserBoilerplate(ez::ezOptionParser &opt) {
    if (opt.isSet("-h")) {
        Usage(opt);
        return 1;
    }

    std::vector<std::string> badOptions;
    if (!opt.gotRequired(badOptions)) {
        for (int i = 0; i < badOptions.size(); ++i) {
            std::cerr << "ERROR: Missing required option " << badOptions[i] << ".\n\n";
        }
        Usage(opt);
        return 1;
    }

    if (!opt.gotExpected(badOptions)) {
        for (int i = 0; i < badOptions.size(); ++i) {
            std::cerr << "ERROR: Got unexpected number of arguments for option " << badOptions[i] << ".\n\n";
        }
        Usage(opt);
        return 1;
    }

    if (opt.isSet("--csvOutput")
            && (opt.isSet("--jsonPanel")
            || opt.isSet("--jsonProperties"))) {
        std::cerr << "ERROR: May not specify both CSV output and JSON output." << std::endl << std::endl;
        Usage(opt);
        return 1;
    }

    if (!(opt.isSet("--csvOutput")
            || opt.isSet("--jsonPanel")
            || opt.isSet("--jsonProperties"))) {
        std::cerr << "ERROR: Must specify at least one output type." << std::endl << std::endl;
        Usage(opt);
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

    assert(sizeof(long long) == 8);
    long long csPeriodLong;
    opt.get("--csPeriod")->getLongLong(csPeriodLong);
    int64_t csPeriod = csPeriodLong;

    RNCReader reader(inputFilename);
    RNCState *state = reader.processHeader();

    PrefixValidator prefix(3);
    PostfixValidator postfix(3);
    RNCStreamPrinter printer(0);
    BadStreamItemDropper dropper;

    reader.setNext(&prefix);
    prefix.setNext(&postfix);
    postfix.setNext(&printer);
    printer.setNext(&dropper);

    Balancer balancer(state, csPeriod);
    dropper.setNext(&balancer);
    RNCStreamTerminator rncterminator;
    balancer.setNext(&rncterminator);



    // At this point CSV and JSON must be exclusive.
    if (opt.isSet("--csvOutput")) {
        CSVPrinter csvPrinter(false);
        balancer.setNextCS(&csvPrinter);
        CSStreamTerminator csTerminator;
        csvPrinter.setNextCS(&csTerminator);
        reader.processBody(state);
    } else { // JSON Property set

        std::vector<JSONOutput *> outputs;

        // Using this variable allows us to add an arbitrary number of items to the processing pipeline.
        CSStreamProcessor *lastCSProcessor = &balancer;

        if (opt.isSet("--jsonProperties")) {
            JSONProperties *properties = new JSONProperties;
            dropper.setNext(properties);
            properties->setNext(&balancer);

            outputs.push_back(properties);
        }


        if (opt.isSet("--jsonPanel")) {
            JSONPanel *jsonPanel = new JSONPanel;
            lastCSProcessor->setNextCS(jsonPanel);
            lastCSProcessor = jsonPanel;

            outputs.push_back(jsonPanel);
        }

        CSStreamTerminator csTerminator;
        lastCSProcessor->setNextCS(&csTerminator);

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