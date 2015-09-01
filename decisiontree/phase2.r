############ Takes a saved decision tree from phase1 and estimates events

source("featureLibrary.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()

## Input block
con <- file("test.csv")
t.full <- read.csv(con)
load("sample_tree.rda")

#phase2 <- function(panel) {
## Formatting block
filler <- rep(0,length(t.full[,1]))
t.full.formatted <- as.data.frame(cbind(filler,t.full$time,t.full$acceleration.x,t.full$acceleration.y,t.full$acceleration.z,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,t.full$rotationrate.x,t.full$rotationrate.y,t.full$rotationrate.z))
names(t.full.formatted) <- c("filler","time", "acceleration.x", "acceleration.y", "acceleration.z","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","rotationrate.x","rotationrate.y","rotationrate.z")

## Feature creation
t.features <- as.data.frame(listToMatrix(features(t.full.formatted)))

## Prediction
prediction <- predict(tree,newdata=t.features)

## Prediction formatting
expanded.prediction <- labelExpand(t.full,prediction)
predictionJSON.df <- createEventJSON(t.full.formatted,expanded.prediction)
eventJSON <- toJSON(predictionJSON.df)

#return(eventJSON)
#}