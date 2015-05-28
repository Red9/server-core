############ Takes a saved cforest from phase1 and estimates events. Stopwatch times blocks.

source("featureLibrary.r")
source("errorCodes.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()

## Input block
    ptm <- proc.time()
con <- file("stdin")
events <- fromJSON(readLines(con,n=1))
    errorcode.read(events,"events")
t.full <- read.csv(con,skip=1)
    errorcode.read(t.full,"data")
load(paste(model))
    stopwatch <- proc.time() - ptm
    write(paste("Time to read in data: ",round(stopwatch[3],4),sep=""),stderr())

## Event trimming
events$events$type[which(events$events$type=="Paddle Out"|events$events$type=="Paddle for Wave")] <- "Paddle" #one type of paddling
events$events <- events$events[which(events$events$type=="Wave"|events$events$type=="Paddle"|events$events$type=="Stationary"),] #paddle, wave or stationary

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
prediction <- list()
prediction[[1]] <- predict(model.list[[1]],newdata=t.features)
    stopwatch <- proc.time() - ptm
    write(paste("Time to compute predictions:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

## Prediction formatting
expanded.prediction <- labelExpand(t.full,prediction[[2]])
predictionJSON.df <- createEventJSON(t.full.formatted,expanded.prediction)
eventJSON <- toJSON(predictionJSON.df)

cat(eventJSON,"\n")