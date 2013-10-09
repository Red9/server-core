var database = require('./../support/database');

exports.get = function(req, res, next){
    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");
    }
    
    
    database.DeleteDataset(req.params.uuid, function(result){
        if(result === false){
            //Not found, so let's 404.
            res.status(404);
            res.end();
        }else{
            res.send("found!");
        }
    });
};