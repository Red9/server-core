
var database = require('./../../support/database');
var underscore = require('underscore')._;
exports.search = function(req, res, next) {

    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    database.getConstrainedDatasets(req.query, function(results) {
        if (simpleOutput) {

            underscore.each(results, function(element, index, list) {
             delete element['processing_notes'];
             delete element['processing_config'];
             delete element['processing_statistics'];
             delete element['summary_statistics'];
             });
        }
        res.json(results);
    });
};

exports.get = function(req, res, next) {
    database.getDataset(req.param('id'), function(dataset) {
        res.json(dataset);
    });
};

exports.update = function(req, res, next) {

    /* // Below is a single pass write, without testing (or running or completion...
     var variables = extractSchemaVariablesFromRequest(req, 'dataset');
     
     if (variables.keys().length === 0) {
     // Nothing to update.
     res.send();
     } else {
     database.updateDataset(req.param('id'), variables, function(err) {
     if (err) {
     var response = {
     message: err
     };
     res.status(404).json(response);
     } else {
     // Successfully updated, nothing to send.
     res.send();
     }
     });
     }*/

    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    /*database.deleteDataset(req.param('id'), function(err) {
     if (err) {
     var response = {
     message: err
     };
     res.status(404).json(response);
     } else {
     // Successfully deleted, nothing to send.
     res.send();
     }
     });*/

    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};
