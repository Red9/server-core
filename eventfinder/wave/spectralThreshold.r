#!/usr/bin/env Rscript
source("spectralCommon.r")

write("Beginning spectral event finding script", stderr())

# Open the STDIN pipe
f<-file("stdin")
open(f)
parameters <- readParameters(f)

# Reading Panel: 'panel' is a list of lists
# panel$time = list containing the time stamps
# panel$`rotationrate:x` = list containing the rotation rate x data
# the length of panel is the number of columns in the input data
# IMP: there SHOULD be a header file containing the names of the columns

# parameters$rowCount<-36991 #: Assuming that this is given in JSON

write("Reading panel", stderr())
panel <- readPanel(f,parameters$rowCount)


# The data column has been renamed "dataaxis", since at this point we don't care
# what it is (acceleration:z, rotationrate:x, etc.)

write("Calculating entropy",stderr())

wEntropy <- findSpecEntropy(panel$`dataaxis`,
							parameters$windowSize,
							parameters$overlapStep,
							1)

write("Calculating event labels",stderr())
event <- getEvent(panel$`dataaxis`,
					wEntropy,
					parameters$thresholdDirection,
					parameters$threshold,
					parameters$windowSize)

write("Calculating the time stamps of the labels",stderr())
wOutLabels <- outputLabels(event,
							wEntropy,
							parameters$windowSize,
							panel$time,
							parameters$mergeThreshold)

write("Converting results to JSON", stderr())

results <- list()
for (i in 1:length(wOutLabels$startTime)) {
	# unbox() taken from here: https://github.com/jeroenooms/jsonlite/issues/6
	# Says to not encode it as a list.
	labelList<-list(
		startTime=unbox(wOutLabels$startTime[i]),
		endTime=unbox(wOutLabels$endTime[i]))
	results <- append(results, list(labelList)) # Convert to list objects
}

write("Outputing results to STDOUT", stderr())

# Output the single list.
cat(toJSON(results),"\n")
Sys.sleep(0.020)
quit(status=0)
