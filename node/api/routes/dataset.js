var underscore = require('underscore')._;
var validator = require('validator');
var datasetResource = requireFromRoot('support/resources/dataset');

function simplifyOutput(datasetArray) {
    underscore.each(datasetArray, function(element, index, list) {
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

    // At this point, req.query has constraints.

    datasetResource.getDatasets(req.query, function(datasets) {
        if (simpleOutput) {
            datasets = simplifyOutput(datasets);
        }
        res.json(datasets);
    });
};

exports.get = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    var expand;
    if (typeof req.query['expand'] !== 'undefined') {
        expand = req.query['expand'].split(',');
        delete req.query['expand'];
    }

    datasetResource.getDatasets({id: req.param('id')}, function(datasets) {
        if (simpleOutput) {
            datasets = simplifyOutput(datasets);
        }
        res.json(datasets);
    }, expand);
};

exports.update = function(req, res, next) {

    var updatedDataset = {};

    var id = req.params['id'];
    delete req.params['id']; // Remove so that we don't try to update with the key.

    underscore.each(datasetResource.resource.schema, function(keyDescription, key) {
        console.log('Searching for key: ' + key);
        if (typeof req.param(key) !== 'undefined') {
            console.log('Found key: ' + key);
            var value = req.param(key);

            // Lazy validation: if we know what type it is, we check to make
            // sure. But we're fine with defaulting to ok.
            if (keyDescription.type === 'uuid') {
                if (validator.isUUID(value) === false) {
                    return;
                }
            } else if (keyDescription.type === 'timestamp') {
                if (validator.isInt(value) === false) {
                    return;
                } else {
                    value = parseInt(value);
                }
            } else if (keyDescription.type === 'resource:summaryStatistics') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    return; // Can't parse the summary statistics.
                }
            }
            updatedDataset[key] = value;
        }
    });

    if (underscore.isEmpty(updatedDataset) === false) {

        datasetResource.updateDataset(id, updatedDataset, function(err, modifiedDataset) {
            if (err) {
                res.status(400).json({message: 'Error updating dataset: ' + err});
            } else {
                res.json(modifiedDataset);
            }
        });
    } else {
        res.status(400).json({message: 'Must submit at least one valid key to update'});
    }
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
