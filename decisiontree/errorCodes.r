############ This file contains functions return various error codes.

errorcode.read <- function(object, object.name) {
    line <- object
    
    if (line=="") { 
        write(paste("Error:", object.name " not received. Exiting.", sep=" "), stderr()) 
        quit(status=1)
    } else {
        write(paste(object.name "received."), stderr())
    }    
}
