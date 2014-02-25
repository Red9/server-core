var underscore = require('underscore')._;

var eventResource = requireFromRoot('support/resources/event');

function simplifyOutput(eventArray) {
    underscore.each(eventArray, function(element, index, list) {
        delete element['summaryStatistics'];
    });
    return eventArray;
}

exports.search = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    // At this point, req.query has constraints.

    eventResource.getEvents(req.query, function(results) {
        if (simpleOutput) {
            results = simplifyOutput(results);
        }
        res.json(results);
    });
};

exports.get = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }
    
    eventResource.getEvents({id:req.param('id')}, function(event){
        if (simpleOutput) {
            event = simplifyOutput(event);
        }
        
        res.json(event);
    });
};

exports.create = function(req, res, next) {
    
    // TODO(SRLM): Make this section derive from the event Resource
    var newEvent = {
        startTime: parseInt(req.param('startTime')),
        endTime: parseInt(req.param('endTime')),
        datasetId: req.param('datasetId'),
        type: req.param('type')
    };
    
    
    
    

    var validUpload = true;
    underscore.each(newEvent, function(value) {
        if (typeof value === 'undefined') {
            validUpload = false;
        }
    });
    
    if (validUpload === false) {
        res.status(403).json({message: 'Must include required parameters.'});
    } else {
        eventResource.createEvent(newEvent, function(err, event) {
            if (typeof event === 'undefined') {
                res.status(500).json({message: 'Could not complete request: ' + err});
            } else {
                // TODO(SRLM): Sometimes an error message is returned instead of event. This should be updated.
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

    eventResource.deleteEvent(id, function(err) {
        if (err) {
            res.status(500).json({message: err});
        } else {
            res.json({});
        }
    });
};
