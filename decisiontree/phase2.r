############ Takes a saved cforest from phase1 and estimates events. Stopwatch times blocks.

source("featureLibrary.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()

filename <- "phase1inputdata_small.txt"

## Input block
ptm <- proc.time()
write("Reading STDIN",stderr())
#con <- file("stdin")
con <- filename
write("Reading JSON",stderr())
parameters <- fromJSON(readLines(con,n=1))
write("Reading CSV",stderr())
t.full <- read.csv(con)
write("Assigning forestFilePath",stderr())
forestFilePath <- parameters$forestFilePath
write("Loading model",stderr())
load(forestFilePath) ### This is where it takes the trained forest
stopwatch <- proc.time() - ptm
write(paste("Time to read in data:",round(stopwatch[3],4),"seconds",sep=" "),stderr())
    
## Formatting block
#t.full.formatted <- formatDataset(t.full)
t.full.formatted <- t.full

## Feature creation
ptm <- proc.time()
t.features.list <- features(t.full.formatted)
t.features <- as.data.frame(listToMatrix(t.features.list))
stopwatch <- proc.time() - ptm
write(paste("Time to compute features:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

## Prediction
ptm <- proc.time()
write("Running prediction",stderr())
prediction <- predict(forest,newdata=t.features)
stopwatch <- proc.time() - ptm
write(paste("Time to compute predictions:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

## Prediction formatting
write("Formatting predictions",stderr())
expanded.prediction <- labelExpand(t.full,prediction)
predictionJSON.df <- createEventJSON(t.full.formatted,expanded.prediction)
eventJSON <- toJSON(predictionJSON.df)

cat(eventJSON,"\n")