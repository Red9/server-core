############ Computes a cforest on a single dataset. Stopwatch times blocks.

    ptm <- proc.time()
source("featureLibrary.r")
source("errorCodes.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()


## Input block
    ptm <- proc.time()
con <- stdin()
events <- fromJSON(readLines(con,n=1))
    errorcode.read(events,"events")
f.full <- read.csv(con,skip=1)
    errocode.read(f.full,"data")
    stopwatch <- proc.time() - ptm
    write(paste("Time to read in data:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

## Event trimming
events$events$type[which(events$events$type=="Paddle Out"|events$events$type=="Paddle for Wave")] <- "Paddle" #one type of paddling
events$events <- events$events[which(events$events$type=="Wave"|events$events$type=="Paddle"|events$events$type=="Stationary"),] #paddle, wave or stationary

## Feature creation
    ptm <- proc.time()
f.features.list <- features(f.full)
    stopwatch <- proc.time() - ptm
    write(paste("Time to compute features:",round(stopwatch[3],4),"seconds",sep=" "),stderr())
f.features <- as.data.frame(listToMatrix(f.features.list))

# Label creation & shrinking
events.full <- createLabel(f.full,events)
events.shrunk <- as.factor(labelShrink(dim(f.features)[1],events.full))
events.shrunk <- as.factor(events.shrunk)
    write(paste("events.shrunk created"),stderr())
f.features <- cbind(f.features,events.shrunk)
    write(paste("events.shrunk appended to f.features"),stderr())

## Tree estimation
    ptm <- proc.time()
    write(paste("Estimating models..."),stderr())
model.list <- list()
forest <- cforest(events.shrunk ~ ., data=f.features,controls=cforest_unbiased(ntree=100))
    stopwatch <- proc.time() - ptm
    write(paste("Time to estimate models:",round(stopwatch[3],4),"seconds",sep=" "),stderr())

model.list[[1]] <- forest

## Output block
save(model.list, file=paste(train,'models_full.rda',sep='_'))

