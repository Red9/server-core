############ Computes a cforest on a single dataset. Stopwatch times blocks.
ttm <- proc.time()
source("featureLibrary.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()


## Input block
ptm <- proc.time()
write("Reading STDIN",stderr())
con <- file("stdin")
write("Reading JSON",stderr())
parameters <- fromJSON(readLines(con,n=1))
write("Reading CSV",stderr())
f.full <- read.csv(con,skip=1)
stopwatch <- proc.time() - ptm
write(paste("Time to read in data:",round(stopwatch[3],4),"seconds",sep=" "),stderr())
write("Assigning forestFilePath",stderr())
forestFilePath <- parameters$forestFilePath

## Event trimming
write("Event trimming",stderr())
parameters$events$type[which(parameters$events$type=="Paddle Out"|parameters$events$type=="Paddle for Wave")] <- "Paddle" #only look for one type of paddling
parameters$events <- parameters$events[which(parameters$events$type=="Wave"|parameters$events$type=="Paddle"|parameters$events$type=="Stationary"),] #only look for "Paddle", "Wave" or "Stationary"

## Feature creation
ptm <- proc.time()
write("Creating features",stderr())
f.features.list <- features(f.full) # compute features
stopwatch <- proc.time() - ptm
write(paste("Time to compute features:",round(stopwatch[3],4),"seconds",sep=" "),stderr())
f.features <- as.data.frame(listToMatrix(f.features.list)) # from a list to a matrix to a data frame

# Label creation & shrinking
write("Label creation and shrinking",stderr())
events.full <- createLabel(f.full,parameters) # creates a label vector for the panel
events.shrunk <- as.factor(labelShrink(dim(f.features)[1],events.full)) # shrinks the label vector to the row dimension of the features
events.shrunk <- as.factor(events.shrunk)
write(paste("events.shrunk created"),stderr())
f.features <- cbind(f.features,events.shrunk)
write(paste("events.shrunk appended to f.features"),stderr())

## Tree estimation
ptm <- proc.time()
write(paste("Estimating models..."),stderr())
model.list <- list() # storing the models in a list is a leftover from testing multiple models in the same phase. I'm leaving it like this for now.
forest <- cforest(events.shrunk ~ ., data=f.features,controls=cforest_unbiased(ntree=500))
stopwatch <- proc.time() - ptm
write(paste("Time to estimate models:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

## Output block
write("Saving model",stderr())
save(forest, file=paste(forestFilePath)) # file naming is bland for now

stopwatch <- proc.time() - ttm
write(paste("Total time for phase 1:",round(stopwatch[3],4),"seconds",sep=" "),stderr())
