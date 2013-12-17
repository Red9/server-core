var database = require('./../support/database');

exports.delete = function(req, res, next){
    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");
        next();
    }

    database.DeleteDataset(req.params.uuid, function(result){
        if(result === false){
            // Not found, so let's 404
            next();
        }else{
            res.send("deleted!");
        }
    });
};