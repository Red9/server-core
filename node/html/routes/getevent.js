var database = require('./../support/database');

exports.get = function(req, res, next){
    database.GetRow("event", "id", req.params.uuid, function(event){
        if(typeof event === "undefined"){
            next();
        }else{
            res.json(event);            
        }
    });
};