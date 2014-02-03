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
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.update = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};
