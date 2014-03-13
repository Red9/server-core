var async = require('async');
var moment = require('moment');
var underscore = require('underscore')._;
var validator = require('validator');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var config = requireFromRoot('config');
var log = requireFromRoot('support/logger').log;

var common = requireFromRoot('support/resourcescommon');

var userResource = requireFromRoot('support/resources/user');
var eventResource = requireFromRoot('support/resources/event');
var panelResource = requireFromRoot('support/resources/panel');

var datasetResource = {
    title: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    owner: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    // --------------------
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    headPanelId: {
        type: 'uuid',
        includeToCreate: false,
        editable: true
    },
    timezone: {
        type: 'string',
        includeToCreate: false,
        editable: true
    },
    source: {// TODO(SRLM): Rename this to recorderInformation (or something...)
        type: 'resource:source',
        includeToCreate: false,
        editable: true
    },
    // ----------------------
    createTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.name = resource.title;
    cassandra.raw_data = resource.headPanelId;
    cassandra.timezone = resource.timezone;
    cassandra.source = JSON.stringify(resource.source); // TODO(SRLM): This should give an error if this is not a JSON object
    cassandra.owner = resource.owner;

    if (typeof resource.createTime !== 'undefined') {
        cassandra.create_time = moment(resource.createTime).toDate();
    }

    underscore.each(cassandra, function(value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });

    return cassandra;
}


function mapToResource(cassandra) {
    var resource = {};

    resource.id = cassandra.id;

    resource.title = cassandra.name;
    resource.headPanelId = cassandra.raw_data;
    resource.timezone = cassandra.timezone;
    resource.owner = cassandra.owner;
    resource.createTime = moment(cassandra.create_time).valueOf();

    try {
        resource.source = JSON.parse(cassandra.source);
    } catch (e) {
        resource.source = {};
    }

    return resource;
}

var createFlush = function(newDataset) {
    newDataset.id = common.generateUUID();
    newDataset.headPanelId = common.generateUUID();
    newDataset.timezone = config.defaultTimezone;
    newDataset.source = {};
    newDataset.createTime = moment().valueOf();
};

exports.resource = {
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'dataset',
    schema: datasetResource,
    create: {
        flush: createFlush
    }
};


exports.createDataset = function(newDataset, callback) {
    common.createResource(exports.resource, newDataset, callback);
};

exports.deleteDataset = function(id, callback) {

    exports.getDatasets({id: id}, function(datasets) {
        if (datasets.length === 1) {
            // Clean up associated resources
            var dataset = datasets[0];
            eventResource.deleteEventByDataset(id, function(errEvent) {
                panelResource.deletePanel(dataset.headPanelId, function(errPanel) {
                    cassandraDatabase.deleteSingle('dataset', id, function(errDataset) {
                        if (errEvent || errPanel || errDataset) {
                            callback(errEvent + ' ' + errPanel + ' ' + errDataset);
                        } else {
                            callback();
                        }

                    });
                });
            });

        } else {
            callback('Invalid dataset id ' + id + ': gave ' + datasets.length + ' responses');
        }
    });


};


/**
 * 
 * @param {type} id
 * @param {type} modifiedDataset
 * @param {type} callback (err, modifiedDataset) err is defined if failure. modifiedDataset includes the information written.
 * @param {type} forceEditable
 * @returns {unresolved}
 */
exports.updateDataset = function(id, modifiedDataset, callback, forceEditable) {
    //------------------------------------------------------------------
    //TODO(SRLM): Make sure that the dataset exists!
    //------------------------------------------------------------------

    if (typeof id === 'undefined' || validator.isUUID(id) === false) {
        callback('Must include valid ID');
        return;
    }

    underscore.each(modifiedDataset, function(value, key) {
        if (key in datasetResource === false
                || (datasetResource[key].editable === false
                        && forceEditable !== true)
                || key === 'id') {
            delete modifiedDataset[key];
        }
    });

    if (modifiedDataset.length === 0) {
        callback('Must include at least one editable item');
        return;
    }

    var cassandraDataset = mapToCassandra(modifiedDataset);

    cassandraDatabase.updateSingle('dataset', id, cassandraDataset, function(err) {
        if (err) {
            log.error('error updating dataset: ' + err);
            callback('error');
        } else {
            callback(undefined, modifiedDataset);
        }
    });
};


function expandIndividualResource(resource, expand, resourceExpandedCallback) {
    if(typeof expand === 'undefined'){
        resourceExpandedCallback(resource);
        return;
    }
    
    async.each(expand,
            function(expandOption, expandCallback) {
                if (expandOption === 'owner') {
                    userResource.getUsers({id: resource.owner}, function(userList) {
                        if (userList.length !== 1) {

                        } else {
                            resource.owner = userList[0];
                        }
                        expandCallback();
                    });
                } else if (expandOption === 'headPanel') {
                    panelResource.getPanel({id: resource.headPanelId}, function(panelList) {
                        if (panelList.length !== 1) {

                        } else {
                            resource.headPanel = panelList[0];
                        }
                        expandCallback();
                    });
                } else {
                    expandCallback();
                }
            },
            function(err) {
                resourceExpandedCallback();
            });
}


function processDataset(parameters, doneCallback) {
    var dataset = parameters.dataset;
    var expand = parameters.expand;
    var constraints = parameters.constraints;
    var result = parameters.result;

    expandIndividualResource(dataset, expand, function(newDataset) {
        if (common.CheckConstraints(dataset, constraints) === true) {
            result.push(dataset);
        } else {
            // Dataset failed constraints
        }
        doneCallback();
    });
}


/**
 * @param {type} constraints
 * @param {type} callback
 * @returns {undefined} Returns an array of datasets.
 * 
 */
exports.getDatasets = function(constraints, callback, expand) {
    //TODO(SRLM): Add check: if just a single dataset (given by ID) then do a direct search for that.
    
    var calculationStartTime = new Date();
    
    var result = [];
    var queue = async.queue(processDataset, 0);

    cassandraDatabase.getAll('dataset',
            function(cassandraDataset) {
                var dataset = mapToResource(cassandraDataset);

                var parameters = {
                    constraints: constraints,
                    dataset: dataset,
                    expand: expand,
                    result: result
                };
                queue.push(parameters);

            },
            function(err) {
                queue.drain = function() {
                    log.debug('Dataset search done. Expanded ' + JSON.stringify(expand) + ' and tested ' + underscore.size(constraints) + ' constraints in ' + (new Date() - calculationStartTime) + ' ms');
                    
                    callback(result);
                };

                queue.concurrency = 5;
            });
};

exports.flushDatasets = function(datasets, callback) {
    // TODO(SRLM): This can be optimized: we should request all the user IDs at
    // once, then distribute the data to the datasets. No need to request each
    // user at a time.
    var result = [];
    async.each(datasets,
            function(dataset, asyncCallback) {
                flushDatasetBody(dataset, function(flushedDataset) {

                    result.push(flushedDataset);
                    asyncCallback();
                });
            },
            function(err) {
                callback(result);
            }
    );
};

/** Add extra information to the dataset.
 * 
 * Adds:
 *  1. Better user information.
 * 
 * @param {type} dataset
 * @param {type} callback
 * @returns {undefined}
 */
function flushDatasetBody(dataset, callback) {
    if (typeof dataset !== 'undefined') {
        userResource.getUsers({id: dataset.owner}, function(users) {
            if (users.length === 1) { // Only assign if there's actually a user.
                var user = users[0];
                var minimal_user = {
                    id: dataset.owner,
                    displayName: user.displayName,
                    first: user.givenName,
                    last: user.familyName,
                    email: user.email
                };
                dataset.owner = minimal_user;
            }
            callback(dataset);
        });
    } else {
        callback(dataset);
    }
}


/**
 * 
 * @param {type} datasetId
 * @param {type} temporaryId
 * @param {type} callback (err)
 * @returns {undefined}
 */
exports.updateToNewPanel = function(datasetId, temporaryId, callback) {
    // Verify that the dataset actually exists.
    exports.getDatasets({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            callback('Incorrect number of datasets for id ' + datasetId + ': ' + datasetList.length);
        } else {
            var dataset = datasetList[0];

            // Try picking the panel out of the list of temporary panels.
            var panel;
            dataset.alternatePanels.temporaryPanels
                    = underscore.reject(
                            dataset.alternatePanels.temporaryPanels, function(item) {
                                if (item.id === temporaryId) {
                                    panel = item;
                                    return true; // Don't keep matching panel
                                } else {
                                    return false; // Keep other panels
                                }
                            });

            if (typeof panel !== 'undefined') {
                var oldPanelId = dataset.headPanelId;

                panelResource.calculatePanelProperties(temporaryId, function(modifiedDataset) {
                    modifiedDataset.alternatePanels = dataset.alternatePanels;
                    modifiedDataset.headPanelId = temporaryId;

                    exports.updateDataset(datasetId, modifiedDataset,
                            function(err, modifiedDataset) {
                                if (err) {
                                    callback('Could not complete request: ' + err);
                                } else {
                                    panelResource.deletePanel(oldPanelId, function(err) {
                                        callback();
                                    });
                                }

                            }, true);
                });
            } else {
                callback('Panel id ' + temporaryId + ' does not exist.');
            }

        }
    });
};