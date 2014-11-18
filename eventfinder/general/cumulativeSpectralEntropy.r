#!/usr/bin/env Rscript
source("spectralCommon.r")

write("Beginning cumulative spectral script.", stderr())

# Open the STDIN pipe
f<-file("stdin")
open(f)
parameters <- readParameters(f)

# Reading Panel: 'panel' is a list of lists
# panel$time = list containing the time stamps
# panel$`rotationrate:x` = list containing the rotation rate x data
# the length of panel is the number of columns in the input data
# IMP: there SHOULD be a header file containing the names of the columns

# rowCount<-36991 : Assuming that this is given in JSON

write("Reading panel.", stderr())
panel <- readPanel(f,parameters$rowCount)

if(parameters$rowCount < parameters$windowSize){
	write("Input panel too small.", stderr())
	cat("{}\n")
	Sys.sleep(0.020)
	quit(status=0)
}

write("finding Entropy.",stderr())

# TODO: Calculate the actual CSE here.
# defaultCse <- 987654321

entropy <- rep(list(list()),length(panel))
CSE<-list()

write(paste("Panel length: ", length(panel)), stderr())

for (i in 1:length(panel)) {
	entropy[[i]] <- findSpecEntropy(panel[[i]],parameters$windowSize,parameters$overlapStep,0)
	write(paste("Preparing entropy of ", names(panel)[i]), stderr())
	CSE[names(panel)[i]]<-sum(entropy[[i]])
}

# For debugging purposes.
write(paste("CSE: !!!!!\n", toJSON(CSE), "\n!!!!!\n\n"), stderr())

# unbox() taken from here: https://github.com/jeroenooms/jsonlite/issues/6
# Says to not encode it as a list.
labelList<-list(
	"overlapStep"=unbox(parameters$overlapStep),
	"windowSize"=unbox(parameters$windowSize),
	"axes"=list(
		"acceleration:x"=unbox(CSE$`acceleration:x`), 
		"acceleration:y"=unbox(CSE$`acceleration:y`),
		"acceleration:z"=unbox(CSE$`acceleration:z`),
	
		"rotationrate:x"=unbox(CSE$`rotationrate:x`),
		"rotationrate:y"=unbox(CSE$`rotationrate:y`),
		"rotationrate:z"=unbox(CSE$`rotationrate:z`),
	
		"magneticfield:x"=unbox(CSE$`magneticfield:x`),
		"magneticfield:y"=unbox(CSE$`magneticfield:y`),
		"magneticfield:z"=unbox(CSE$`magneticfield:z`),
		
		"gps:speed"=unbox(CSE$`gps:speed`)
	
	))
	# Repeat for each axis in the input panel

# Output the single list.
cat(toJSON(labelList),"\n")

Sys.sleep(0.020)
quit(status=0)
