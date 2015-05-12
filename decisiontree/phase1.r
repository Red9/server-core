############ Computes a decision tree on a single dataset

source("featureLibrary.r")
suppressMessages(library(jsonlite))
suppressMessages(library(party))
closeAllConnections()

## Input block
con <- file("sample_full.csv")
events <- fromJSON(readLines(con,n=1))
f.full <- read.csv(con,skip=1)

#phase1 <- function(panel,events) {
## Feature creation
f.features.list <- features(f.full)
f.features <- as.data.frame(listToMatrix(f.features.list))

# Label creation & shrinking
events.full <- createLabel(f.full,events)
events.shrunk <- as.factor(labelShrink(f.features,events.full))

## Tree estimation
tree <- ctree(events.shrunk ~ ., data=f.features) #TODO: change to cforest
#forest <- cforest(events.shrunk ~ .)

## Output block
save(tree, file="sample_tree.rda")
#}
