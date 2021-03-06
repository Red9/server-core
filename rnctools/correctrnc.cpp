#include <iostream>
#include <RNCStreamPrinter.hpp>
#include <RNCReader.hpp>
#include <PostfixValidotor.hpp>
#include <PrefixValidator.hpp>
#include <BadStreamItemDropper.hpp>
#include <RNCStreamTerminator.hpp>
#include <JSONPanel.hpp>

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
            "", // Default
            1, // Required
            1, // Number of args expected
            0, // Delimiter if expecting multiple args
            "Path to output file.", // Help description
            "--outputFile"
    );

    opt.add(
            "", // Default
            1,
            1,
            0,
            "Default timestamp in microseconds from epoch if one is not set and there is no GPS lock.",
            "--default"
    );

    opt.add(
            "", // Default
            0,
            0,
            0,
            "Correct CLKFREQ based on GPS readings. Default false.",
            "--correctClkfreq"
    );

    opt.add(
            "30", // Default
            0,
            1,
            0,
            "Specify the minimum number of minutes of GPS lock required to make clkfreq correction.",
            "--minimumGPS"
    );
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
        Usage(opt);
        return 1;
    }

    if (!opt.gotExpected(badOptions)) {
        for (unsigned int i = 0; i < badOptions.size(); ++i) {
            std::cerr << "ERROR: Got unexpected number of arguments for option " << badOptions[i] << ".\n\n";
        }
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

    std::string outputFilename;
    opt.get("--outputFile")->getString(outputFilename);

    assert(sizeof(long long) == 8);
    long long defaultTimestampLong;
    opt.get("--default")->getLongLong(defaultTimestampLong);
    int64_t defaultTimestamp = defaultTimestampLong * 1000; // Convert from milliseconds to microseconds

    long long GPSLockTimeLong;
    opt.get("--minimumGPS")->getLongLong(GPSLockTimeLong);
    int64_t minimumGPSLockTime = GPSLockTimeLong * 60 * 1000 * 1000; // Convert from minutes to microseconds

    RNCReader reader(inputFilename);
    RNCState *state = reader.processHeader(std::map<std::string, double >());

    PrefixValidator prefix(3);
    PostfixValidator postfix(3);
    RNCStreamPrinter printer(0);
    BadStreamItemDropper dropper;

    reader.setNext(&prefix);
    prefix.setNext(&postfix);
    postfix.setNext(&printer);
    printer.setNext(&dropper);

    RNCStreamTerminator rncterminator;
    dropper.setNext(&rncterminator);

    reader.processBody(state);

    time_t rawtime =
            state->estimateCorrectedBasetime(defaultTimestamp) / (1000 * 1000); // convert from microseconds to seconds
    struct tm *ptm = gmtime(&rawtime);

    char resultTimeString[30];
    strftime(resultTimeString, 30, "%FT%T+0000", ptm); // creates a string like 2014-10-06T14:59:51+0000

    std::ifstream rnc(inputFilename, std::ios::in | std::ios::binary);
    if (!rnc.good()) {
        throw std::runtime_error("Input file not good");
    }

    std::ofstream output(outputFilename, std::ios::out | std::ios::binary);
    if (!output.good()) {
        throw std::runtime_error("Output file not good");
    }

    rapidjson::Document header;
    ExtractHeader::extractHeader("||||||||", 8, header, &rnc);

    header["createTime"].AddMember("brokenTime.old", header["createTime"]["brokenTime"], header.GetAllocator());
    header["createTime"]["brokenTime"].SetString(resultTimeString, strlen(resultTimeString));


    if (opt.isSet("--correctClkfreq")) {
        header["timestampFormat"]["frequency"].SetInt(state->estimateCorrectedClkfreq(minimumGPSLockTime));
    }

    rapidjson::StringBuffer strbuf;
    rapidjson::Writer<rapidjson::StringBuffer> writer(strbuf);
    header.Accept(writer);

    output << strbuf.GetString() << "||||||||";

    // Output the rest of the file
    // starting with the closing quote from above
    // Do it this way so that we don't output a 0xFF at the very end
    for (unsigned long t = rnc.get(); t != -1; t = rnc.get()) {
        output.put(t);
    }

    rnc.close();
    output.close();

    return 0;
}




























