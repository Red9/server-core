#!/usr/bin/env Rscript
source("common.r")
source("wave.r") 
source("paddle.r")
source("duckdive.r")

# ------------------------------------------------------------------------------
# Session script.
#
# This script loads up the given panel then waits for commands of actions to
# run against that panel. Each command is given by a JSON object of the format
#
# { "command" : "COMMAND_NAME", "parameters" : {} }
#
# Where parameters is unique to the particular command.
#
# The event finding commands produce output of the following type:

# Besides the event finding commands this script supports the following
# control commands:
#
# - "exit" - exit from the script immediately.
#
# ------------------------------------------------------------------------------


write("Beginning spectral event finding script", stderr())

# Assuming that the parameters come first
f<-file("stdin")
open(f)

write("Reading RowCount",stderr())
rowCount <- readParameters(f)
rowCount <- checkRowCount(rowCount)
# print(parameters$rowCount)

write("Reading panel", stderr())
panel <- readPanel(f,rowCount$rowCount)

while (1) { 

    write("Reading Commands",stderr())
    parameters <- readParameters(f)

    #print(parameters$command) # For readability

    if (parameters$command=="exit"){
        write("Received the exit command. Exiting ...",stderr())        
        break;
    }
    check <- checkParameters(parameters,rowCount$rowCount)
    if (check == 1) {
        if (parameters$command == "wave") {
            write ("Wave finding ... ",stderr())
            results <- findWave(panel,parameters$parameters)
        } else if (parameters$command =="paddle") {
            write("Paddle finding ... ", stderr())
            results <- findPaddle(panel,parameters$parameters)
        } else if (parameters$command == "duckdive") {
            write("DuckDive Finding ... ",stderr())
            results <- findDuckdive(panel,parameters$parameters)
        }
       
        results <- list(type=parameters$parameters$eventType,results=results)
        write("Outputing results to STDOUT", stderr())
        cat(toJSON(results),"\n")
    } else {
        printEmpty(parameters$command) 
    }
}

Sys.sleep(0.020)
quit(status=0)
