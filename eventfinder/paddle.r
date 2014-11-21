#!/usr/bin/env Rscript
source("common.r")

checkPaddleParams <- function(parameters) {
    checkPaddle <- 0
    if (!(parameters$parameters$pThresholdDirection == "above" | parameters$parameters$pThresholdDirection == "below")) {
        write("Error: pThreshold direction should either be above or below",stderr())
    } else if (parameters$parameters$pThreshold < 1 ) {
        write("Error: pThreshold should be greater than 1",stderr())
    } else if (parameters$parameters$minLength < 0) {
        write("Error: minLength should be greater than 0",stderr())
    } else {
        checkPaddle <- 1
    }
    return(checkPaddle)
}

findPaddle <- function(panel,parameters) {

    panel$`rotationrate:x`<- as.numeric(as.character(panel$`rotationrate:x`))
    
    write("Calculating dominant frequency",stderr())
    pEntropy <- findSpecEntropy(panel$`rotationrate:x`,
                                parameters$windowSize,
                                parameters$overlapStep,
                                1)
    
    
    write("Interpolating frequency",stderr())
    paddleFreq <- getFreq(      panel$`rotationrate:x`,
                                pEntropy$domFreq,
                                pEntropy$nFrames,
                                parameters$windowSize,
                                parameters$minLength)

    write("Calculating the time stamps of the paddle labels",stderr())
    freqLabels <- outputLabels( paddleFreq,
                                parameters$windowSize,
                                panel$time,
                                parameters$pMergeThreshold)
    
    write("Converting results to JSON", stderr())
    
    results <- list()
    if ( freqLabels$startTime == 0 && freqLabels$endTime == 0 ) {
        results <- vector()
    } else {
        for (i in 1:length(freqLabels$startTime)) {
            labelList<-list(
                startTime=unbox(freqLabels$startTime[i]),
                endTime=unbox(freqLabels$endTime[i]),
                type=unbox(parameters$eventType))
            results <- append(results, list(labelList)) # Convert to list objects
        }
    }
    return (results)
}

# Interpolate the frequency based on the stretches
getFreq <- function(pData,domFreq,nFrames,winSize,minLength) {

    domFreq[domFreq!=1.171875]<-0
    domFreq[domFreq==1.171875]<-1 #2.34375
        
    transList <- findTransition(domFreq)
    fStartTimes <- transList$wStartTimes
    fEndTimes <- transList$wEndTimes
    
    for (i in 1:length(fStartTimes)) {
        if ((fEndTimes[i]-fStartTimes[i])<minLength){
            domFreq[fStartTimes[i]:fEndTimes[i]]<-0
        }
    }
    
    freq<-rep(0,length(pData))
    #freq[((winSize/2)*(1:length(Entropy)))]<-domFreq
    freq[((winSize/2)*(1:nFrames))]<-domFreq

    idx <- which(freq!=0)
    for( i in 1:length(idx) ){
        freq[idx[i]:(idx[i]+(winSize-1))]<-freq[idx[i]]
    }
    
    return(freq)
}
#freqLabels$startTime<-freqLabels$startTime-panel$time[1]
#freqLabels$endTime<-freqLabels$endTime-panel$time[1]
