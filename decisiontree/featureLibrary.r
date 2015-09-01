############ This file contains functions to compute various features over arbitrary windows time-series data.

suppressMessages(library(stringr))

zeroCrossings <- function(panel) {
    crosser <- matrix(0,nrow=dim(panel)[1],ncol=dim(panel)[2])
    for (i in 1:dim(panel)[2]) {
        crosser[,i][which(panel[,i]>0)] <- 1
        crosser[,i][which(panel[,i]<=0)] <- -1
    }
    zeros <- rep(0,dim(panel)[2])
    crosserReg <- rbind(zeros,crosser)
    crosserShift <- rbind(crosser,zeros)
    crosserDiff <- crosserReg + crosserShift
    crossings <- c(length(which(crosserDiff[,1]==0)),length(which(crosserDiff[,2]==0)),length(which(crosserDiff[,3]==0)),length(which(crosserDiff[,4]==0)),length(which(crosserDiff[,5]==0)),length(which(crosserDiff[,6]==0)))
    names(crossings) <- c("acc.x.zerocrossings","acc.y.zerocrossings","acc.z.zerocrossings","rotr.x.zerocrossings","rotr.y.zerocrossings","rotr.z.zerocrossings")
    return(crossings)
}

meanCrossings <- function(panel) {
    panelmean <- colMeans(panel)
    crosser <- matrix(0,nrow=dim(panel)[1],ncol=dim(panel)[2])
    for (i in 1:dim(panel)[2]) {
        crosser[,i][which(panel[,i]>panelmean[i])] <- 1
        crosser[,i][which(panel[,i]<=panelmean[i])] <- -1
    }
    zeros <- rep(0,dim(panel)[2])
    crosserReg <- rbind(zeros,crosser)
    crosserShift <- rbind(crosser,zeros)
    crosserDiff <- crosserReg + crosserShift
    crossings <- c(length(which(crosserDiff[,1]==0)),length(which(crosserDiff[,2]==0)),length(which(crosserDiff[,3]==0)),length(which(crosserDiff[,4]==0)),length(which(crosserDiff[,5]==0)),length(which(crosserDiff[,6]==0)))
    names(crossings) <- c("acc.x.meancrossings","acc.y.meancrossings","acc.z.meancrossings","rotr.x.meancrossings","rotr.y.meancrossings","rotr.z.meancrossings")
    return(crossings)
}

rangeDiffs <- function(panel) {
    diffs <- c(max(range(panel[,1]))-min(range(panel[,1])),max(range(panel[,2]))-min(range(panel[,2])),max(range(panel[,3]))-min(range(panel[,3])),max(range(panel[,4]))-min(range(panel[,4])),max(range(panel[,5]))-min(range(panel[,5])),max(range(panel[,6]))-min(range(panel[,6])))
    names(diffs) <- c("acc.x.rangediff","acc.y.rangediff","acc.z.rangediff","rotr.x.rangediff","rotr.y.rangediff","rotr.z.rangediff")
    return(diffs)
}

elementRanges <- function(panel) {
    ranges <- c(max(range(panel[,1])),min(range(panel[,1])),max(range(panel[,2])),min(range(panel[,2])),max(range(panel[,3])),min(range(panel[,3])),max(range(panel[,4])),min(range(panel[,4])),max(range(panel[,5])),min(range(panel[,5])),max(range(panel[,6])),min(range(panel[,6])))
    names(ranges) <- c("acc.x.max","acc.x.min","acc.y.max","acc.y.min","acc.z.max","acc.z.min","rotr.x.max","rotr.x.min","rotr.y.max","rotr.y.min","rotr.z.max","rotr.z.min")
    return(ranges)
}

enmo <- function(panel) {
    enmo <- (sqrt(rowSums(cbind(panel[3]^2,panel[4]^2,panel[5]^2)))-9.80665)/9.80665
    names(enmo) <- c("enmo")
    return(enmo)
}

# creates a full-size label vector from a panel and event list
createLabel <- function(panel,events) {
    events.full <- rep("Other",length(panel[,1]))
    for (i in 1:length(events$events$type)) {
        events.full[which(panel$time>=events$events$startTime[i]&panel$time<=events$events$endTime[i])] <- events$events$type[i]
    }
    return(events.full)
}

# shifts a binary vector 1 observation forward; (1,1,0,0) becomes (0,1,1,0) 
shiftOneForward <- function(bvector) {
    bvector.shifted <- rep(0,(length(bvector)+1))
    bvector.shifted[2:length(bvector.shifted)] <- bvector
    bvector.shifted <- bvector.shifted[1:(length(bvector.shifted)-1)]
    
    return(bvector.shifted)
}

# creates a stringified JSON line with events from a prediction vector and panel
createEventJSON <- function(panel,expand.label) {
    event.binary <- rep(0,length(expand.label))
    event.binary <- ifelse(expand.label!="Other",1,0)
    event.binary.shifted <- shiftOneForward(event.binary)
    
    transitions <- event.binary - event.binary.shifted #+1 is start, -1 is end. start and end are shifted one forward from the truth.
    
    eventJSON <- matrix(nrow=length(which(transitions==1)),ncol=3)
    
    eventJSON[,1] <- expand.label[which(transitions==1)]
    eventJSON[,2] <- panel$time[which(transitions==1)]
    eventJSON[,3] <- panel$time[which(transitions==-1)-1]
    
    colnames(eventJSON) <- c("type","startTime","endTime")
    eventJSON <- as.data.frame(eventJSON)
    
    return(eventJSON)
}

# expands a feature-size prediction vector to a vector of panel length
labelExpand <- function(panel,label) {
	expand.label <- rep("Other",length(panel[,1]))
	expand.factor <- floor(length(panel[,1])/length(label))

	for(i in 0:(length(label)-1)) {
		expand.label[((i*expand.factor)+1):(expand.factor*(i+1))] <- as.character(label[i+1])
	}

	return(expand.label)
}


# shrinks a full-size label vector to length of feature vector
labelShrink <- function(panel,label) {
	shrunk.label<-rep("Other",length(panel[,1]))
	shrink.factor<-floor(length(label)/length(panel[,1]))

	for(i in 0:length(panel[,1])-1) {
		events <- table(label[((i*shrink.factor)+1):(shrink.factor*(i+1))])
        mostCommon <- names(which.max(events))
        shrunk.label[i+1] <- mostCommon
	}

	return(shrunk.label)
}

# converts a matrix of lists to a matrix of numerics
listToMatrix <- function(panel.list) {
    panel.matrix <- matrix(data=NA,nrow=dim(panel.list)[1],ncol=dim(panel.list)[2])
    for (i in 1:ncol(panel.list)) {
        panel.matrix[,i] <- c(as.numeric(panel.list[,i]))
    }
    colnames(panel.matrix) <- colnames(panel.list)
    
    return(panel.matrix)
}


features <- function(panel){
    n <- length(panel[,3])
    win.length <- 100
    nwindows <- floor(n/win.length)
    feature.panel <- list()
         
    for (i in 0:(nwindows-1)) {
        write(paste("Window", i),stderr())
        window.panel <- cbind(panel$acceleration.x[(i*win.length+1):(i*win.length+win.length)],panel$acceleration.y[(i*win.length+1):(i*win.length+win.length)],panel$acceleration.z[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.x[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.y[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.z[(i*win.length+1):(i*win.length+win.length)])
        feature.1 <- colMeans(window.panel)
        names(feature.1) <- c("mean.acc.x","mean.acc.y","mean.acc.z","mean.rotr.x","mean.rotr.y","mean.rotr.z")
        feature.2 <- zeroCrossings(window.panel)
        feature.3 <- meanCrossings(window.panel)
        feature.4 <- rangeDiffs(window.panel)
        feature.5 <- elementRanges(window.panel)
        feature.6 <- enmo(window.panel)
        feature.row <- c(feature.1,feature.2,feature.3,feature.4,feature.5,feature.6)
        feature.panel <- rbind(feature.panel,feature.row)
    }

return(feature.panel)
}
