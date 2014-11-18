# wDetected is the dataset where the entropy is non-zero in the wave regions

findCSE<-function(wDetected) {
	# Shift the detected panel by 1, by appending 0 as the first element
	fullEntropy<-rep(0,length(wDetected))
	fullEntropy<-wDetected
	wDetected[which(wDetected!=0)]<-1
	wShiftDetected<-append(0,wDetected)
	
	# First difference between the original and the shifted should give the transitions
	wDiff<-wDetected-wShiftDetected[1:length(wDetected)]
	
	# convert to time assuming each sample is 10ms apart
	# wTransition<-which(wDiff!=0)*10 <<Shyama: these give the actual 10ms times>>
	
	# convert to time stamps
	wIndices<-which(wDiff!=0)
	
	sumEntropy<-rep(0,length(fullEntropy))
	for ( t in 1:((length(wIndices)/2)-1) ) {
		sumEntropy[wIndices[2*t+1]:wIndices[2*(t+1)]]<-rep(sum(fullEntropy[wIndices[2*t+1]:wIndices[2*(t+1)]]),length(wIndices[2*t+1]:wIndices[2*(t+1)]))
	}

	return(sumEntropy)
}
