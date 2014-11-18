#!/usr/bin/env Rscript
source("spectralCommon.r")

write("Beginning spectral wave event finding script", stderr())

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

wEntropy <- findSpecEntropy(panel$`acceleration:z`,
							parameters$windowSize,
							parameters$overlapStep,
							1)

tEntropy <- findSpecEntropy(panel$`magneticfield:x`,
							parameters$windowSize,
							parameters$overlapStep,
							1)

pEntropy <- findSpecEntropy(panel$`rotationrate:x`,
							parameters$windowSize,
							parameters$overlapStep,
							1)

write("Calculating event labels",stderr())
wave <- getEvent(panel$`acceleration:z`,
					wEntropy,
					parameters$wThresholdDirection,
					parameters$wThreshold,
					parameters$windowSize)
paddle <- getEvent(panel$`rotationrate:x`,
					pEntropy,
					parameters$pThresholdDirection,
					parameters$pThreshold,
					parameters$windowSize)
tailSlide <- getEvent(panel$`magneticfield:x`,
					tEntropy,
					parameters$tThresholdDirection,
					parameters$tThreshold,
					parameters$windowSize)

write("Calculating the time stamps of the labels",stderr())
wOutLabels <- outputLabels(wave,
							wEntropy,
							parameters$windowSize,
							panel$time,
							parameters$wMergeThreshold)
pOutLabels <- outputLabels(paddle,
							pEntropy,
							parameters$windowSize,
							panel$time,
							parameters$pMergeThreshold)
tOutLabels <- outputLabels(tailSlide,
							tEntropy,
							parameters$windowSize,
							panel$time,
							parameters$tMergeThreshold)


write("Converting results to JSON", stderr())

results <- list()
for (i in 1:length(wOutLabels$startTime)) {
	# unbox() taken from here: https://github.com/jeroenooms/jsonlite/issues/6
	# Says to not encode it as a list.
	for ( j in 1:length(pOutLabels$endTime) ) {
		if ((pOutLabels$startTime[j]<wOutLabels$startTime[i]) && (pOutLabels$endTime[j]>wOutLabels$startTime[i]) && (pOutLabels$endTime[j]<wOutLabels$endTime[i])) 
		wOutLabels$startTime[i]<-pOutLabels$endTime[j]
	}
	
	for ( k in 1:length(tOutLabels$startTime) ) {
		if ((tOutLabels$startTime[k]<wOutLabels$endTime[i]) && (tOutLabels$startTime[k]>wOutLabels$startTime[i]) && (tOutLabels$endTime[k]>wOutLabels$endTime[i])) 
		wOutLabels$endTime[i]<-tOutLabels$startTime[k]
	}
	
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
