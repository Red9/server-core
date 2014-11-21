#!/usr/bin/env Rscript
source("common.r")

checkWaveParams <- function(parameters) {
    checkWave <- 0
    if (!(parameters$parameters$wThresholdDirection == "above" | parameters$parameters$wThresholdDirection == "below")) {
        write("Error: threshold direction should either be above or below",stderr())
    } else if (!(parameters$parameters$pThresholdDirection == "above" | parameters$parameters$pThresholdDirection == "below")) {
        write("Error: pThreshold direction should either be above or below",stderr())
    } else if (!(parameters$parameters$tThresholdDirection == "above" | parameters$parameters$tThresholdDirection == "below")) {
        write("Error: tThreshold direction should either be above or below",stderr())
    } else if (parameters$parameters$wThreshold>1 | parameters$parameters$wThreshold < 0) {
        write("Error: wThreshold should lie within 0 and 1",stderr())
    } else if (parameters$parameters$pThreshold < 1 ) {
        write("Error: pThreshold should be greater than 1",stderr())
    } else if (parameters$parameters$tThreshold < 1 ) {
        write("Error: tThreshold should be greater than 1",stderr())
    } else if (parameters$parameters$ampThreshold>1 | parameters$parameters$ampThreshold < 0) {
        write("Error: ampThreshold should lie within 0 and 1",stderr())
    } else if (parameters$parameters$accThreshold>1 | parameters$parameters$accThreshold < 0) {
        write("Error: accThreshold should lie within 0 and 1",stderr())
    } else if (parameters$parameters$minLength < 0) {
        write("Error: minLength should be greater than 0",stderr())
    } else if (parameters$parameters$accPortion1>1 | parameters$parameters$accPortion1 < 0) {
        write("Error: accPortion1 should lie within 0 and 1",stderr())
    } else if (parameters$parameters$accPortion2>1 | parameters$parameters$accPortion2 < 0) {
        write("Error: accPortion2 should lie within 0 and 1",stderr())
    } else if (parameters$parameters$accPortion3>1 | parameters$parameters$accPortion3 < 0) {
        write("Error: accPortion3 should lie within 0 and 1",stderr())
    } else if (parameters$parameters$strictness>1 | parameters$parameters$strictness < 0) {
        write("Error: strictness should lie within 0 and 1",stderr())
    } else {
        checkWave <- 1
    }
    return (checkWave)
}

findWave <- function(panel,parameters){
    # panel <- as.numeric(as.character(panel))
    write("Calculating entropy",stderr())

    panel$`acceleration:z`<- as.numeric(as.character(panel$`acceleration:z`))
    panel$`rotationrate:x`<- as.numeric(as.character(panel$`rotationrate:x`))
    panel$`magneticfield:x`<- as.numeric(as.character(panel$`magneticfield:x`))
    panel$`gps:speed`<- as.numeric(as.character(panel$`gps:speed`))
    
    parameters$strictness <- 1-parameters$strictness
    parameters$wThreshold <- parameters$wThreshold - (parameters$strictness/5)
    parameters$accPortion1 <- parameters$accPortion1 - (parameters$strictness/5)
    parameters$accPortion2 <- parameters$accPortion2 - (parameters$strictness/10)
    
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
    wave <- getEvent(           panel$`acceleration:z`,
                                wEntropy$Entropy,
                                parameters$wThresholdDirection,
                                parameters$wThreshold,
                                parameters$windowSize)
    paddle <- getEvent(         panel$`rotationrate:x`,
                                pEntropy$Entropy,
                                parameters$pThresholdDirection,
                                parameters$pThreshold,
                                parameters$windowSize)
    tailSlide <- getEvent(      panel$`magneticfield:x`,
                                tEntropy$Entropy,
                                parameters$tThresholdDirection,
                                parameters$tThreshold,
                                parameters$windowSize)
    
    waveNtap <- removeTaps(     wave,
                                panel$`gps:speed`,
                                panel$`acceleration:z`,
                                parameters$maxAcc,
                                parameters$maxAcc2,
                                parameters$speedThresh,
                                parameters$accPortion1,
                                parameters$accPortion2,
                                parameters$accPortion3)
    
    write("Calculating the time stamps of the wave labels",stderr())
    wOutLabels <- outputLabels( waveNtap$wave,
                                parameters$windowSize,
                                panel$time,
                                parameters$wMergeThreshold)
    pOutLabels <- outputLabels( paddle,
                                parameters$windowSize,
                                panel$time,
                                parameters$pMergeThreshold)
    tOutLabels <- outputLabels( tailSlide,
                                parameters$windowSize,
                                panel$time,
                                parameters$tMergeThreshold)
    
    write("Converting results to JSON", stderr())
    
    results <- list()
    if ( wOutLabels$startTime == 0 && wOutLabels$endTime == 0 ) {
        results <- vector()
    } else {
        for (i in 1:length(wOutLabels$startTime)) {
            for ( j in 1:length(pOutLabels$endTime) ) {
                if ((pOutLabels$startTime[j]<wOutLabels$startTime[i]) 
                                && (pOutLabels$endTime[j]>wOutLabels$startTime[i]) 
                                && (pOutLabels$endTime[j]<wOutLabels$endTime[i])) {
                    wOutLabels$startTime[i]<-pOutLabels$endTime[j]
                }
            }
            
            for ( k in 1:length(tOutLabels$startTime) ) {
                if ((tOutLabels$startTime[k]<wOutLabels$endTime[i]) 
                                && (tOutLabels$startTime[k]>wOutLabels$startTime[i]) 
                                && (tOutLabels$endTime[k]>wOutLabels$endTime[i])) {
                    wOutLabels$endTime[i]<-tOutLabels$startTime[k]
                }
            }
           
            labelList<-list(
                startTime=unbox(wOutLabels$startTime[i]),
                endTime=unbox(wOutLabels$endTime[i]),
                type=unbox(parameters$eventType))
            results <- append(results, list(labelList)) # Convert to list objects
        }
    }

    return (results)
}

# wave filter to remove the false positives
removeTaps <- function(wave,gpsSpeed,accZ,maxAcc,maxAcc2,speedThresh,accPortion1,accPortion2,accPortion3) {
    
    gpsSpeed[which(is.na(gpsSpeed))]<-0
    transList <- findTransition(wave)
    wStartTimes <- transList$wStartTimes
    wEndTimes <- transList$wEndTimes
    
    # New variable
    waveNew<-wave
    
    # Filtering
    for (i in 1:length(wStartTimes)) {

        maxAccZ<-max(accZ[wStartTimes[i]:wEndTimes[i]])
        maxSpeed<-max(gpsSpeed[wStartTimes[i]:wEndTimes[i]])
        
        speedAbvThresh<-0
        accAbvThresh2<-0
        
        if (maxAccZ>maxAcc) {
            accAbvThresh <- (length(which(accZ[wStartTimes[i]:wEndTimes[i]]>(maxAcc)))
                                                    /(wEndTimes[i]-wStartTimes[i]))
            accAbvThresh2 <- (length(which(accZ[wStartTimes[i]:wEndTimes[i]]>(maxAcc2)))
                                                    /(wEndTimes[i]-wStartTimes[i]))

            if (maxSpeed>(speedThresh)*max(gpsSpeed)) {
                speedAbvThresh<-length(
                    which(gpsSpeed[wStartTimes[i]:wEndTimes[i]]>
                            (speedThresh*max(gpsSpeed))))
            } else {
                speedAbvThresh <- -1
            }
        
        } else {
            accAbvThresh<-0
        }
        

        if (accAbvThresh > accPortion1 ) {
            waveNew[wStartTimes[i]:wEndTimes[i]]<-1
        } else if ( accAbvThresh > accPortion2 & speedAbvThresh > 1) {
            waveNew[wStartTimes[i]:wEndTimes[i]]<-1
        } else if ( speedAbvThresh==-1 & accAbvThresh2> accPortion2 ) {
            waveNew[wStartTimes[i]:wEndTimes[i]]<-1
        } else {
            waveNew[wStartTimes[i]:wEndTimes[i]]<-0
        }
    }
    
    # speed<-gpsSpeed
    # speed[which(speed<ampThreshold*max(speed))]<-0
    
    # tap<-rep(0,length(wave))
    
    # tap[which(wave==1 & (accZ<accThreshold | speed==0))]<-1
    # tap[which(accZ>accThreshold && tap==1)]<-0
    # wave[which(tap==1)]<-0
    # wave[which(wave==1 & speed==0)]<-0
    
    waveNtap<-list(wave=waveNew)#,tap=tap)
    return(waveNtap)
}
