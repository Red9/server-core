suppressMessages(library(jsonlite))
suppressMessages(library(signal))

# Read the JSON Parameters
readParameters<-function(f){
    line <- readLines(f,n=1)
    
    if ( line=="" ) { 
        write("Error: Parameters not found. Exiting.", stderr()) 
        quit(status=1)
    } else {
        write("Parameters found", stderr())
        
        inParameters<-fromJSON(line)
        
        return (inParameters)
    }
}

checkRowCount<-function(rowCount) {
    if (rowCount$rowCount < 1) {
        write("Error: Very few number of rows(less than 1)", stderr())
        printEmpty()
    }
    return (rowCount)
}

checkParameters <- function(parameters,rowCount) {
    check <- 0
    if (parameters$parameters$windowSize > rowCount) {
        write("Error: invalid windowSize",stderr())
    } else if (parameters$parameters$overlapStep > 100) {
        write("Error: OverlapStep should be between 0 and 100",stderr())
    } else if (parameters$command=="wave") {
        check <- checkWaveParams(parameters)
    } else if (parameters$command=="paddle") {
        check <- checkPaddleParams(parameters)
    } else if (parameters$command=="duckdive") {
        check <- checkDuckdiveParams(parameters)
    } else if (parameters$command=="exit") {
        check <- 1
    } else {
        write("Error: Unknown event type",stderr())
        printEmpty(parameters$command) 
    }
    
    return(check)
}

printEmpty <- function(type) {
    names <- c("type","results")
    results<-vector("list",length(names))
    names(results) <- names
    results$type <- unbox(type)
    results$results <- vector()
    write("Outputing results to STDOUT", stderr())
    cat(toJSON(results))
}

# Find Spectral Entropy, Dominant Frequency
# of a given signal x, with window size winSize
findSpecEntropy<-function(x,winSize,OverlapStep,norm) {

    n_samples<-length(x)
    
    if(OverlapStep > 0) {
        Overlap <- floor((OverlapStep*winSize)/100)
        nFrames <- floor(n_samples/Overlap) - 1
    } else {
        Overlap <- winSize
        nFrames <- floor(n_samples/Overlap) - 100
    }
   
    Entropy <- rep(0,nFrames) # it needs to be a column vec!
    domFreq <- Entropy
    
    k <- 1
    inc <- 1 # 100?
    
    while ( (k+winSize-1) <= n_samples ) {
        FrameSignal <- x[k:(k+winSize-1)]
        v <- (as.numeric(as.character(FrameSignal)) * hanning(length(FrameSignal)))
        N <- length(v)
        Y <- fft(v)

        sqrtPyy <- ((sqrt(abs(Y)*abs(Y))*2)/N)
        sqrtPyy <- sqrtPyy [1:(winSize/2)]
        
        d <- sqrtPyy
        
        domFreq[inc] <- which(d==max(d))*(50/128)
        
        if (norm==1) {
            d <- d/sum(d+1e-12)
        }

        logd <- log(d+1e-12)/log(2)
        Entropy[inc] <- -sum(d*logd)*log(2)/log(length(d))
        
        k <- k + Overlap
        inc <- inc + 1
    }
    
    Entropy <- list(Entropy=Entropy,domFreq=domFreq,nFrames=nFrames)
    return(Entropy)
}

# Get the labeled event signal from a given panel whose entropy is calculated
# with a window of length winSize and thresholded at values greater than the given threshold
getEvent <- function(panel,Entropy,thresholdDirection, threshold,winSize) {

    if(thresholdDirection == "above"){
        Entropy[which(Entropy>threshold*(max(Entropy)))]<-1
    } else if(thresholdDirection == "below"){
        Entropy[which(Entropy<threshold*(min(Entropy)))]<-1
    } else{
        write("Error: must specify threshold direction. Exiting.", stderr())
        quit(status = 1)
    }
    
    Entropy[which(Entropy!=1)]<-0
    event<-rep(0,length(panel))
    event[((winSize/2)*(1:length(Entropy)))]<-Entropy

    idx <- which(event==1)

    if (length(idx) > 1) {
        for( i in 1:length(idx) ){
            event[idx[i]:(idx[i]+winSize)]<-1
        }
    } else {
        event[which(event==1)]<-0
    }

    return(event)
}

# Read sensor:axis data from the panel  
readPanel <- function(f,rowCount) {
    
    # Read the labels
    line <- readLines(f,n=1)
    if (line=="") {
        cat(toJSON(list(message="Error: MissingData: panel axes not found")))
        quit(save="default",status=1,runLast=FALSE)
    }

    axesLabels<-strsplit(line, ",")
    
    # initializing a list to contain all the parameter lists
    wParam<-rep(list(list()),length(axesLabels[[1]]))

    for (param in 1:length(wParam)) {
        length(wParam[[param]])<-rowCount
    }

    rowCtr<- 0
    
    # Read the first row of the panel data
    line <- readLines(f,n=1)
    while(length(line) > 0  # break on EOF
          && nchar(line) > 0 # or on empty line (does this actually work? 
                             # line is a vector, right? It seems to, but prove it. -SRLM)
    ){
        rowCtr<-rowCtr+1    
        # split the panel on comma
        rowData <- list(as.numeric(unlist(strsplit(line,","))))
        
        # Getting different parameter values
        for( param in 1:length(axesLabels[[1]]) ) {
            wParam[[param]][rowCtr]<-rowData[[1]][param]
        }
    
        # check for NANs
        wParam[which(is.na(wParam))]<-0 
        
        if(rowCtr %% 10000 == 0){
            cat("Read", rowCtr, "/", rowCount, "lines from input panel\n", file=stderr())
        }

        # Is this the last row?
        if(rowCtr == rowCount){
            # Break if it's the last row.
            break;
        }
        # If it's not the last row, then read the next row.
        line <- readLines(f,n=1)
    }

    wTrain<-list()

    for( param in 1:length(axesLabels[[1]]) ) {
        wTrain[[axesLabels[[1]][param]]]<-unlist(wParam[[param]])
    }
    return (wTrain)
}

# Convert the detected sample-by-sample to give out start and stop
outputLabels<-function(wDetected,winSize,wTime,mergeThreshold) {
    
    # Shift the detected panel by 1, by appending 0 as the first element
    wShiftDetected<-append(0,wDetected)
    
    # First difference between the original and the shifted should give the transitions
    wDiff<-wDetected-wShiftDetected[1:length(wDetected)]
    
    # convert to time assuming each sample is 10ms apart
    # wTransition<-which(wDiff!=0)*10 <<Shyama: these give the actual 10ms times>>
    
    # convert to time stamps
    wIndices<-which(wDiff!=0)
    wTransition<-wTime[wIndices[1:length(wIndices)]]

    # getting the start/end times
    wStartTimes<-list()
    wEndTimes<-list()

    # Check if the list is even, then pick alternate times from wTransition
    if (length(wTransition)%%2==0) {
        wStartTimes<-wTransition[((1:(length(wTransition)/2))*2)-1]
        wEndTimes<-wTransition[((1:(length(wTransition)/2))*2)]
    } else if (length(wTransition)!=1) {
        wStartTimes<-wTransition[((1:((length(wTransition)-1)/2))*2)-1]
        wEndTimes<-wTransition[((1:((length(wTransition)-1)/2))*2)]
    } else {
        wStartTimes<-wTransition
    }

    # if the last event has a start time but no end time, quote the end time as inf
    if (length(wStartTimes)>length(wEndTimes)) {
        wEndTimes<-append(wEndTimes,length(wDetected))
        if (length(wStartTimes) > 1) {
            # Merge events that are "close" together (less than mergeThreshold)
            for (t in 1:(length(wStartTimes)-1)) {
                if ((wStartTimes[t+1]-wEndTimes[t])<mergeThreshold) {
                    wStartTimes[t+1]<-(-1)
                    wEndTimes[t]<-(-1)
                }
            }
        }
        else {
                wStartTimes<-0
                wEndTimes<-0
        }
    }

    wStartTimes=wStartTimes[wStartTimes!=-1]
    wEndTimes=wEndTimes[wEndTimes!=-1]

    wOutLabels<-list(startTime=wStartTimes,endTime=wEndTimes)

    return(wOutLabels)
}

# find the cumulative Spectral Entropy
findCSE<-function(panel,threshold,thresholdDirection,overlapStep,winSize) {

    entropy<-findSpecEntropy(panel,winSize,overlapStep,1)
    wDetected<-getEvent(panel,entropy,thresholdDirection,threshold,winSize)

    # Shift the detected panel by 1, by appending 0 as the first element
    fullEntropy<-rep(0,length(wDetected))
    fullEntropy[((winSize/2)*(1:length(entropy)))]<-entropy
    
    wDetected[which(wDetected!=0)]<-1
    wShiftDetected<-append(0,wDetected)
    
    # First difference between the original and the shifted should give the transitions
    wDiff<-wDetected-wShiftDetected[1:length(wDetected)]
    
    wIndices<-which(wDiff!=0)
    
    sumEntropy<-rep(0,length(fullEntropy))
    for ( t in 1:((length(wIndices)/2)-1) ) {
        sumEntropy[wIndices[2*t+1]:wIndices[2*(t+1)]] <- rep(
                    sum(fullEntropy[wIndices[2*t+1]:wIndices[2*(t+1)]]),
                    length(wIndices[2*t+1]:wIndices[2*(t+1)]))
    }

    return(sumEntropy)
}

findTransition<-function(event) {
    # Extracting the start, end times
    shiftedWave<-append(0,event)
    wDiff<-event-shiftedWave[1:length(event)]
    wTransition<-which(wDiff!=0)
        
    # print(length(which(wDiff!=0)))
    
    if (length(wTransition)%%2==0) {
        wStartTimes<-wTransition[((1:(length(wTransition)/2))*2)-1]
        wEndTimes<-wTransition[((1:(length(wTransition)/2))*2)]
    } else if (length(wTransition)!=1) {
        wStartTimes<-wTransition[((1:((length(wTransition)-1)/2))*2)-1]
        wEndTimes<-wTransition[((1:((length(wTransition)-1)/2))*2)]
    } else {
        wStartTimes<-wTransition
    }

    if (length(wStartTimes)>length(wEndTimes)) {
        wEndTimes<-append(wEndTimes,length(event)) 
    }

    return(list(wStartTimes=wStartTimes,wEndTimes=wEndTimes))
}
