############ This file contains functions to compute various features over arbitrary windows time-series data. Functions are features or utilities to help compute them.

suppressMessages(library(stringr))
suppressMessages(library(zoo))
suppressMessages(library(sandwich))

## all the features
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
    crossings <- rep(0,dim(panel)[2])
    for (i in 1:length(crossings)) {
        crossings[i] <- length(which(crosserDiff[,i]==0))
    }
    names(crossings) <- c("acc.x.zerocrossings","acc.y.zerocrossings","acc.z.zerocrossings","rotr.x.zerocrossings","rotr.y.zerocrossings","rotr.z.zerocrossings","resid.adr.zerocrossings","resid.rgr.zerocrossings")
    return(crossings)
}

meanCrossings <- function(panel,means) {
    #windowmean <- colMeans(panel)
    panelmean <- means
    crosser <- matrix(0,nrow=dim(panel)[1],ncol=dim(panel)[2])
    for (i in 1:dim(panel)[2]) {
        crosser[,i][which(panel[,i]>panelmean[i])] <- 1
        crosser[,i][which(panel[,i]<=panelmean[i])] <- -1
    }
    zeros <- rep(0,dim(panel)[2])
    crosserReg <- rbind(zeros,crosser)
    crosserShift <- rbind(crosser,zeros)
    crosserDiff <- crosserReg + crosserShift
    crossings <- rep(0,dim(panel)[2])
    for (i in 1:length(crossings)) {
        crossings[i] <- length(which(crosserDiff[,i]==0))
    }
    names(crossings) <- c("acc.x.meancrossings","acc.y.meancrossings","acc.z.meancrossings","rotr.x.meancrossings","rotr.y.meancrossings","rotr.z.meancrossings","resid.adr.meancrossings","resid.rgr.meancrossings")
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
    enmo <- (sqrt(rowSums(cbind(panel[1]^2,panel[2]^2,panel[3]^2)))-9.80665)/9.80665
    names(enmo) <- c("enmo")
    return(enmo)
}

# Acceleration decomposition regression. acc:mag ~ acc:x + acc:y + acc:z
ADR <- function(panel) {
    X <- as.data.frame(cbind(panel[,1],panel[,2],panel[,3]))
    names(X) <- c("ax","ay","az")
    Y <- panel[,7]
    model <- lm(Y ~ ax + ay + az, data=X)
    return(model)
}

# Regresses acc:mag ~ rotr:x + rotr:y + rotr:z
RGR <- function(panel) {
    X <- as.data.frame(cbind(panel[,4],panel[,5],panel[,6]))
    names(X) <- c("rx","ry","rz")
    Y <- panel[,7]
    model <- lm(Y ~ rx + ry + rz, data=X)
    return(model)
}

# Regresses depvar ~ rotr:x + rotr:y + rotr:z
iRAR <- function(panel,depvar) {
    X <- as.data.frame(cbind(panel[,4],panel[,5],panel[,6]))
    names(X) <- c("rx","ry","rz")
    Y <- panel[,depvar]
    model <- lm(Y ~ rx + ry + rz, data=X)
    return(model)
}

# Returns vector of coefficients from arbitrary regression with model name
getBetas <- function(model,model.name) {
    model.betas <- coefficients(model)
    for (i in 1:length(names(model.betas))) {
        names(model.betas)[i] <- paste(model.name,names(model.betas)[i],sep=".")
    }
    return(model.betas)
}

# Returns vector of covariances from arbitrary regression with model name
getVcov <- function(model,model.name) {
    model.vcov <- vcovHC(model,type="HC3")
    model.vcov.line <- model.vcov[upper.tri(model.vcov,diag=TRUE)]
    namelist <- list()
    for (j in 1:dim(model.vcov)[2]) {
        for (i in 1:j) {
            namelist <- c(namelist,paste(model.name,"v",rownames(model.vcov)[i],colnames(model.vcov)[j],sep="."))
        }
    }
    namelist <- as.character(namelist)
    names(model.vcov.line) <- namelist
    return(model.vcov.line)
}


# calculate roll first and then pitch
roll.pitch <- function(panel) {
    angle <- rep(0,length=dim(panel)[1])
    ax <- panel$acceleration.x/panel$acceleration.magnitude
    ay <- panel$acceleration.y/panel$acceleration.magnitude
    az <- panel$acceleration.z/panel$acceleration.magnitude
    epsilon <- 0.01
    roll <- rep(0,length=length(az))
    roll[which(az>epsilon)] <- atan(ay[which(az>epsilon)]/az[which(az>epsilon)])
    roll[which(az<=epsilon)] <- 0
    # get pitch using atan and roll
    pitch <- atan(-ax/sqrt((ay*sin(roll))^2 + (az*cos(roll))^2))
    angles <- cbind(roll,pitch)
    return(angles)
}

## all the utilities
# creates a full-size label vector from a panel and event list
createLabel <- function(panel,events) {
    events.full <- rep("Other",length(panel[,1]))
    for (i in 1:length(events$events$type)) {
        events.full[which(panel$time>=events$events$startTime[i]&panel$time<=events$events$endTime[i])] <- as.character(events$events$type[i])
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
    event.cat <- rep(0,length(expand.label))
    event.types <- levels(as.factor(expand.label))
    
    for (i in 1:length(event.types)) {
        event.cat[which(expand.label==event.types[i])] <- i  
    }
    event.cat.shifted <- shiftOneForward(event.cat)
    transitions <- event.cat - event.cat.shifted 
    eventJSON <- matrix(nrow=length(which(transitions!=0)),ncol=3)
    
    starts <- which(transitions!=0)
    ends <- which(transitions!=0)-1
    ends <- ends[-1]
    ends[length(ends)+1] <- length(expand.label)
    
    for(i in 1:length(event.types)) {
        eventJSON[,1] <- expand.label[which(transitions!=0)]
        eventJSON[,2] <- panel$time[starts]
        eventJSON[,3] <- panel$time[ends]
    }
    
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
labelShrink <- function(outputlength,label) {
	shrunk.label<-rep("Other",outputlength)
	shrink.factor<-floor(length(label)/outputlength)

	for(i in 0:(outputlength-1)) {
		events <- table(label[((i*shrink.factor)+1):(shrink.factor*(i+1))])
        mostCommon <- names(which.max(events))
        shrunk.label[i+1] <- mostCommon
	}

	return(shrunk.label)
}

# takes a potentially-multinomial label vector and a "string" and turns it into a binary label vector where events of type "string" are 1
numifyLabel <- function(label,string) {
    num.label <- rep(0,length(label))
    num.label[label==paste(string)] <- 1
    
    return(num.label)
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

# takes an dataset downloaded from the website and formats it for features
formatDataset <- function(panel) {
    filler <- rep(0,length(panel[,1]))
    panel.formatted <- as.data.frame(cbind(filler,panel$time,panel$acceleration.x,panel$acceleration.y,panel$acceleration.z,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,filler,panel$rotationrate.x,panel$rotationrate.y,panel$rotationrate.z))
    names(panel.formatted) <- c("filler","time", "acceleration.x", "acceleration.y", "acceleration.z","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","filler","rotationrate.x","rotationrate.y","rotationrate.z")
    
    return(panel.formatted)
}

# calculates all features. applies global transformations including sensor element selection first, window transformations over all data and global transformations
features <- function(panel){
    n <- dim(panel)[1]
    win.length <- 200
    nwindows <- floor(n/win.length)
    feature.panel <- list()
    
    ## global features
    selected.panel <- as.data.frame(cbind(panel$acceleration.x,panel$acceleration.y,panel$acceleration.z,panel$rotationrate.x,panel$rotationrate.y,panel$rotationrate.z,panel$acceleration.magnitude))
    colnames(selected.panel) <- c("acceleration.x","acceleration.y","acceleration.z","rotationrate.x","rotationrate.y","rotationrate.z","acc.magnitude")
    
    resid.ADR <- as.data.frame(residuals(ADR(selected.panel)))
    names(resid.ADR) <- c("resid.ADR")
    
    resid.RGR <- as.data.frame(residuals(RGR(selected.panel)))
    names(resid.RGR) <- c("resid.RGR")
        
    panel.means <- colMeans(selected.panel)
    names(panel.means) <- c("mean.acc.x","mean.acc.y","mean.acc.z","mean.rotr.x","mean.rotr.y","mean.rotr.z","mean.acc.mag")
     
    panel <- as.data.frame(cbind(selected.panel,resid.ADR,resid.RGR))
    
    ## window features
    write(paste("Computing features..."),stderr())
    for (i in 0:(nwindows-1)) {
        window.panel <- as.data.frame(cbind(panel$acceleration.x[(i*win.length+1):(i*win.length+win.length)],panel$acceleration.y[(i*win.length+1):(i*win.length+win.length)],panel$acceleration.z[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.x[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.y[(i*win.length+1):(i*win.length+win.length)],panel$rotationrate.z[(i*win.length+1):(i*win.length+win.length)],panel$resid.ADR[(i*win.length+1):(i*win.length+win.length)],panel$resid.RGR[(i*win.length+1):(i*win.length+win.length)]))
        
        feature.1 <- colMeans(window.panel)
        names(feature.1) <- c("wmean.acc.x","wmean.acc.y","wmean.acc.z","wmean.rotr.x","wmean.rotr.y","wmean.rotr.z","wmean.resid.ADR","wmean.resid.RGR")
        feature.2 <- zeroCrossings(window.panel)
        feature.3 <- meanCrossings(window.panel,panel.means)
        feature.4 <- rangeDiffs(window.panel)
        feature.5 <- elementRanges(window.panel)
        feature.6 <- enmo(window.panel)
        
        iRARx.model <- iRAR(window.panel,1)
        iRARy.model <- iRAR(window.panel,2)
        iRARz.model <- iRAR(window.panel,3)
        ADR.model <- ADR(window.panel)
        
        feature.7 <- c(getBetas(iRARx.model,"iRARx"),getVcov(iRARx.model,"iRARx"))
        feature.8 <- c(getBetas(iRARy.model,"iRARy"),getVcov(iRARy.model,"iRARy"))
        feature.9 <- c(getBetas(iRARz.model,"iRARz"),getVcov(iRARz.model,"iRARz"))
        feature.10 <- c(getBetas(ADR.model,"ADR"),getVcov(ADR.model,"ADR"))
        
        feature.11 <- roll.pitch(window.panel)
        
        feature.row <- c(feature.1,feature.2,feature.3,feature.4,feature.5,feature.6,feature.7,feature.8,feature.9,feature.10,feature.11)
        feature.panel <- rbind(feature.panel,feature.row)
    }
    write(paste("Done."),stderr())
    
return(feature.panel)
}

