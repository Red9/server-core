
var log = require('./../../support/logger').log;
var database = require('./../../support/database');

exports.get = function(req, res, next){
    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");        
        next();
    }
    
    database.GetRow("dataset", "id", req.params.uuid, function(content){
        if(typeof content === "undefined"){
            next();
        }else{
            content["page_title"] = "Custom Download";
            res.render("customdownload", content);
        }
    });
};

