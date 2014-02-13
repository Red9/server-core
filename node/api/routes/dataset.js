
var datasetResource = require('./../../support/resources/resource/dataset_resource');
var underscore = require('underscore')._;

function simplifyOutput(datasetArray) {
    underscore.each(datasetArray, function(element, index, list) {
        delete element['summaryStatistics'];
        delete element['source'];
    });

    return datasetArray;
}

exports.search = function(req, res, next) {

    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    var flushOutput = false;
    if (typeof req.query['flushoutput'] !== 'undefined') {
        delete req.query['flushoutput'];
        flushOutput = true;
    }
    // At this point, req.query has constraints.

    datasetResource.getDatasets(req.query, function(datasets) {
        if (simpleOutput) {
            datasets = simplifyOutput(datasets);
        }
        if (flushOutput === true) {
            datasetResource.flushDatasets(datasets, function(flushedDatasets) {
                res.json(flushedDatasets);
            });
        } else {
            res.json(datasets);
        }
    });
};

exports.get = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    var flushOutput = false;
    if (typeof req.query['flushoutput'] !== 'undefined') {
        delete req.query['flushoutput'];
        flushOutput = true;
    }

    datasetResource.getDatasets({id: req.param('id')}, function(datasets) {
        if (simpleOutput) {
            datasets = simplifyOutput(datasets);
        }
        if (flushOutput === true) {
            datasetResource.flushDatasets(datasets, function(flushedDatasets) {
                res.json(flushedDatasets);
            });
        } else {
            res.json(datasets);
        }
    });
};

exports.update = function(req, res, next) {

    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    var id = req.param('id');

    datasetResource.deleteDataset(id, function(err) {
        if (err) {
            res.status(500).json({message: err});
        } else {
            res.json({});
        }
    });
};
