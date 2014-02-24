var async = require('async');
var moment = require('moment');
var underscore = require('underscore')._;
var validator = require('validator');

var cassandraDatabase = require('./../datasources/cassandra');
var config = require('./../../../config');
var log = require('./../../logger').log;

var common = require('./../common');

var userResource = require('./user_resource');
var eventResource = require('./event_resource');
var panelResource = require('./panel_resource');

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
    source: { // TODO(SRLM): Rename this to recorderInformation (or something...)
        type: 'resource:source',
        includeToCreate: false,
        editable: true
    },
    axes: {
        type: 'array:string',
        includeToCreate: false,
        editable: true
    },
    // ----------------------
    summaryStatistics: {
        type: 'resource:summaryStatistics',
        includeToCreate: false,
        editable: true
    },
    startTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    },
    endTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    },
    panels: {
        type: 'resource:panelMeta',
        includeToCreate: false,
        editable: true
    },
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
    cassandra.source = JSON.stringify(resource.source);
    cassandra.owner = resource.owner;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);
    cassandra.create_time = moment(resource.createTime).toDate();
    cassandra.raw_data_list = JSON.stringify(resource.panels);

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
    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        resource.summaryStatistics = {};
    }
    try {
        resource.panels = JSON.parse(cassandra.raw_data_list);
        resource.axes = resource.panels[resource.headPanelId].axes;
        resource.startTime = resource.panels[resource.headPanelId].startTime;
        resource.endTime = resource.panels[resource.headPanelId].endTime;
    } catch (e) {
        log.error('Failed to read dataset panels. datasetId: ' + resource.id);
        resource.panels = {};
        resource.axes = [];
        resource.startTime = 0;
        resource.endTime = 0;
    }

    return resource;
}



exports.createDataset = function(newDataset, callback) {
    var valid = common.checkNewResourceAgainstSchema(datasetResource, newDataset);
    if (typeof valid !== 'undefined') {
        callback('Schema failed: ' + valid);
        return;
    }

    newDataset.id = common.generateUUID();
    newDataset.headPanelId = common.generateUUID();
    newDataset.timezone = config.defaultTimezone;
    newDataset.source = {};
    newDataset.summaryStatistics = {};
    newDataset.createTime = moment().valueOf();
    newDataset.panels = {};
    newDataset.panels[newDataset.headPanelId] = {
        startTime: 0,
        endTime: 0,
        axes: []
    };

    var cassandraDataset = mapToCassandra(newDataset);

    cassandraDatabase.addSingle('dataset', cassandraDataset, function(err) {
        if (err) {
            log.warn('DatasetResource: Error on creating new dataset: ' + err);
            callback('error');
        } else {
            log.debug('Successfully created new dataset ' + newDataset.id);
            callback(undefined, [newDataset]);
        }
    });
};

exports.deleteDataset = function(id, callback) {

    exports.getDatasets({id: id}, function(datasets) {
        if (datasets.length === 1) {
            // Clean up associated resources
            var dataset = datasets[0];
            eventResource.deleteEventByDataset(id, function(errEvent) {
                panelResource.deletePanel(dataset.panelId, function(errPanel) {
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
            console.log('error updating dataset: ' + err);
            callback('error');
        } else {
            callback(undefined, modifiedDataset);
        }
    });
};

/**
 * @param {type} constraints
 * @param {type} callback
 * @returns {undefined} Returns an array of datasets.
 * 
 */
exports.getDatasets = function(constraints, callback) {
    //TODO(SRLM): Add check: if just a single dataset (given by ID) then do a direct search for that.
    var result = [];

    cassandraDatabase.getAll('dataset',
            function(cassandraDataset) {
                var dataset = mapToResource(cassandraDataset);
                if (common.CheckConstraints(dataset, constraints) === true) {
                    result.push(dataset);
                } else {
                    // Dataset failed constraints
                }
            },
            function(err) {
                callback(result);
            });
};


// This stuff needs to be updated...




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