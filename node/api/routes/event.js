var database = require('./../../support/database');
var underscore = require('underscore')._;

exports.search = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    database.getConstrainedEvents(req.query, function(results) {
        if (simpleOutput) {
            underscore.each(results, function(element, index, list) {
                delete element['summary_statistics'];
            });
        }
        res.json(results);
    });
};

exports.get = function(req, res, next) {
    database.getEvent(req.param('id'), function(event) {
        res.json(event);
    });
};

exports.create = function(req, res, next) {
    
    var new_event = {
        start_time: parseInt(req.param('start_time')),
        end_time: parseInt(req.param('end_time')),
        dataset: req.param('dataset'),
        type: req.param('type')
    };
    
    var definedUpload = true;
    underscore.each(new_event, function(value){
       if(typeof value === 'undefined'){
           definedUpload = false;
       } 
    });
    
    
        
    if(definedUpload === false){
        res.status(403).json({message:'Must include required parameters.'});
    }else{
        
        database.createEvent(new_event, function(event){
            if(typeof event === 'undefined'){
                res.status(500).json({message:'Could not complete request.'});
            }else{
                res.json(event); 
            }
           
        });
        
    }
};

exports.update = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    var id = req.param('id');
    
    database.deleteEvent(id, function(err){
        if(err){
            res.status(500).json({message:err});
        }else{
            res.json({});
        }
    });
};
