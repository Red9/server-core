
var log = require('./../support/logger').log;
var database = require('./../support/database');

exports.get = function(req, res){
    
    
    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");        
    }
    
    database.GetDataset(req.params.uuid, function(content){
        
        
        res.render("customdownload", content);
    });
    
    
    
}

