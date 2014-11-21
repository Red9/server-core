#!/usr/bin/env Rscript
source("common.r")

checkDuckdiveParams <- function(f) {
    checkDuckdive <- 0
    if (!(parameters$parameters$dThresholdDirection == "above" | parameters$parameters$dThresholdDirection == "below")) {
        write("Error: dThreshold direction should either be above or below",stderr())
    } else if (parameters$parameters$dThreshold>1 | parameters$parameters$dThreshold < 0) {
        write("Error: dThreshold should lie within 0 and 1",stderr())
    } else if (parameters$parameters$lowThX>1 | parameters$parameters$lowThX < 0) {
        write("Error: lowThX should lie within 0 and 1",stderr())
    } else if (parameters$parameters$hiThX>1 | parameters$parameters$hiThX < 0) {
        write("Error: hiThX should lie within 0 and 1",stderr())
    } else if (parameters$parameters$lowThZ>1 | parameters$parameters$lowThZ < 0) {
        write("Error: lowThZ should lie within 0 and 1",stderr())
    } else if (parameters$parameters$hiThZ>1 | parameters$parameters$hiThZ < 0) {
        write("Error: hiThZ should lie within 0 and 1",stderr())
    } else {
        checkDuckdive <- 1
    }
    return (checkDuckdive)

}
findDuckdive <- function(panel,parameters){

    # panel <- as.numeric(as.character(panel))
    write("Calculating entropy",stderr())

    panel$`acceleration:z`<- as.numeric(as.character(panel$`acceleration:z`))
    panel$`acceleration:x`<- as.numeric(as.character(panel$`acceleration:x`))
    panel$`rotationrate:y`<- as.numeric(as.character(panel$`rotationrate:y`))
    
    dEntropy <- findSpecEntropy(panel$`acceleration:x`,
                                parameters$windowSize,
                                parameters$overlapStep,
                                1)
    
    write("Calculating event labels",stderr())
    duckdive <- getEvent(       panel$`acceleration:x`,
                                dEntropy$Entropy,
                                parameters$dThresholdDirection,
                                parameters$dThreshold,
                                parameters$windowSize)
    
    duckdiveNew <- getDive(     duckdive,
                                panel$`acceleration:x`,
                                panel$`rotationrate:y`,
                                panel$`acceleration:z`,
                                parameters$lowThX,
                                parameters$hiThX,
                                parameters$lowThZ,
                                parameters$hiThZ,
                                parameters$minLengthX,
                                parameters$varLength,
                                parameters$minLengthZ)

    write("Calculating the time stamps of the duckdive labels",stderr())
    dOutLabels <- outputLabels( duckdiveNew$duckdive,
                                parameters$windowSize,
                                panel$time,
                                parameters$dMergeThreshold)
    
    write("Converting results to JSON", stderr())
    
    results <- list()
    if ( dOutLabels$startTime == 0 && dOutLabels$endTime == 0 ) {
        results <- vector()
    }
    else {
        for (i in 1:length(dOutLabels$startTime)) {
            labelList<-list(
                startTime=unbox(dOutLabels$startTime[i]),
                endTime=unbox(dOutLabels$endTime[i]),
                type=unbox(parameters$eventType))
            results <- append(results, list(labelList)) # Convert to list objects
        }
    }

    return (results)
}

getDive <- function(duckdive,accX,rotY,accZ,lowThX,hiThX,lowThZ,hiThZ,minLengthX,varLength,minLengthZ) {
    transList <- findTransition(duckdive)
    wStartTimes <- transList$wStartTimes
    wEndTimes <- transList$wEndTimes

    duckdiveNew <- rep(0,length(duckdive))
    
    for (i in 1:length(wStartTimes)) {
    
        FrameZ<-accZ[wStartTimes[i]:wEndTimes[i]]
        FrameX<-rotY[wStartTimes[i]:wEndTimes[i]]*accX[wStartTimes[i]:wEndTimes[i]]
        #FrameZ<-accZ[wStartTimes[i]:wEndTimes[i]]
        
        
        minAccX<-min(accX[wStartTimes[i]:wEndTimes[i]])
        maxAccX<-max(accX[wStartTimes[i]:wEndTimes[i]])

        maxAccZ<-max(accZ[wStartTimes[i]:wEndTimes[i]])
        minAccZ<-min(accZ[wStartTimes[i]:wEndTimes[i]])
        
        minRotY<-min(rotY[wStartTimes[i]:wEndTimes[i]])
        maxRotY<-max(rotY[wStartTimes[i]:wEndTimes[i]])

        minFrameX<-min(FrameX)
        maxFrameX<-max(FrameX)
        
        accBlwThresh2<-0
        accAbvThresh<-0
        accAbvThresh2<-0
        #print(minAccX)
        accNeg<-length(which(accX[wStartTimes[i]:wEndTimes[i]]<(0)))/(wEndTimes[i]-wStartTimes[i])
        #accPos<-length(which(accX[wStartTimes[i]:wEndTimes[i]]>(5)))/(wEndTimes[i]-wStartTimes[i])
        
        if (minAccX < 0 & length(which(FrameZ>50))<4 & accNeg>0 & maxRotY>0 & minRotY <0) {
            lowX<-(lowThX*minFrameX) #0.4
            HighX<-(hiThX*maxFrameX) #0.3
            
            lowZ<- (lowThZ*maxAccZ) #0.3
            HighZ<- (hiThZ*maxAccZ) #0.5
            
            FrameX[which(FrameX>lowX & FrameX<HighX)]<- 0
            FrameX[which(FrameX<=lowX)]<- -1
            FrameX[which(FrameX>=HighX)]<- 1
            
            FrameZ[which(FrameZ<=lowZ)]<- -1
            FrameZ[which(FrameZ>lowZ & FrameZ<HighZ)]<- 0
            FrameZ[which(FrameZ>=HighZ)]<- 1

            diffX<- append(0,diff(FrameX,1))
            indices<-which(diffX==1 & FrameX==0)
            indices1<-which(diffX==1 & FrameX==1)
            #print("indices")
            #print(indices)
            #print(indices1)
            trans<-0
            
            if (length(indices)>0 & length(indices1)>0) {
                for (ind in 1:length(indices)) {
                    #print(indices[ind])
                    trans<-which(indices1>indices[ind])[1]
                    #print(trans)
                    if (!(is.na(trans)) & (indices1[trans]-indices[ind])>minLengthX & indices1[trans]>varLength & indices[ind]>varLength) { #minLengthX 30, varLength 10, minLengthZ 20
                        if (length(which(FrameZ[indices[ind]:indices1[trans]]==0)>minLengthZ) & 
                            length(which(FrameZ[(indices[ind]-varLength):(indices[ind]+varLength)]==1)) > 0 &
                            length(which(FrameZ[(indices1[trans]-varLength):(indices1[trans]+varLength)]==-1)) > 0) {
                                duckdiveNew[wStartTimes[i]:wEndTimes[i]]<-1
                        }
                    }
                    trans<-0
                }
            }
        }
    }
    
    duckdiveNew<-list(duckdive=duckdiveNew)#,sit=sit)
    return(duckdiveNew)
}
