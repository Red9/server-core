var moment = require('moment');
var validator = require('validator');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var cassandraPanel = requireFromRoot('support/datasources/cassandra_panel');
var cassandraPanelProcessor = requireFromRoot('support/datasources/cassandra_panel_processor');

var common = requireFromRoot('support/resourcescommon');
var useful = requireFromRoot('support/useful');
var datasetResource = requireFromRoot('support/resources/dataset');

var underscore = require('underscore')._;

var config = requireFromRoot('config');

var panelResource = {
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    datasetId: {
        type: 'uuid',
        includeToCreate: true,
        editable: false
    },
    axes: {
        type: 'array:string',
        includeToCreate: false,
        editable: false
    },
    createTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    },
    startTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false,
        panelLocal: true
    },
    endTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false,
        panelLocal: true
    },
    summaryStatistics: {
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    timezone: {
        type: 'string',
        includeToCreate: false,
        editable: true
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset_id = resource.datasetId;
    cassandra.columns = resource.axes;
    cassandra.timezone = resource.timezone;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);


    if (typeof resource.createTime !== 'undefined') {
        cassandra.create_time = moment(resource.createTime).toDate();
    }
    if (typeof resource.startTime !== 'undefined') {
        cassandra.start_time = moment(resource.startTime).toDate();
    }
    if (typeof resource.endTime !== 'undefined') {
        cassandra.end_time = moment(resource.endTime).toDate();
    }

    underscore.each(cassandra, function(value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });

    return cassandra;
}

function mapToResource(cassandra, callback) {
    var resource = {};
    resource.id = cassandra.id;
    resource.datasetId = cassandra.dataset_id;
    resource.axes = cassandra.columns;
    resource.timezone = cassandra.timezone;
    resource.createTime = moment(cassandra.create_time).valueOf();
    resource.startTime = moment(cassandra.start_time).valueOf();
    resource.endTime = moment(cassandra.end_time).valueOf();

    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        resource.summaryStatistics = {};
    }

    callback(resource);
}

function createFlush(newPanel) {
    newPanel.id = useful.generateUUID();
    newPanel.createTime = moment().valueOf();
    newPanel.startTime = moment().valueOf();// Default to now
    newPanel.endTime = moment().valueOf();// Default to now
    newPanel.summaryStatistics = {};
    newPanel.axes = [];
    newPanel.timezone = config.defaultTimezone;
}

function deletePost(id) {
    cassandraPanel.deletePanel(id, function() {
    });
}


exports.resource = {
    name: 'panel',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'panelProperties',
    schema: panelResource,
    create: {
        flush: createFlush
    },
    delete: {
        post: deletePost
    }
};




exports.create = function(newPanel, callback) {
    common.createResource(exports.resource, newPanel, callback);
};

exports.update = function(id, modifiedPanel, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedPanel, callback, forceEditable);
};

exports.get = function(constraints, callback, expand) {
    common.getResource(exports.resource, constraints, callback, expand);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

/**
 * 
 * @param {type} panelId the actual raw data panel ID (not dataset ID)
 * @param {type} callback ({ } ) Calls with an object with the err, calculated properties.
 * @returns {undefined}
 */
exports.calculatePanelProperties = function(panelId, doSlow, callback) {
    cassandraPanel.calculatePanelProperties(panelId, doSlow, callback);
};

/** Checks the raw data. Mostly useful in validation programs.
 * 
 * @param {type} panelId
 * @param {type} callback
 * @returns {undefined}
 */
exports.exists = function(panelId, callback) {
    cassandraPanel.exists(panelId, callback);
};

//------------------------------------------------------------------------------
//  Panel Data modification
//------------------------------------------------------------------------------

/**
 * 
 * @param {type} panelId
 * @param {type} time in MS since epoch
 * @param {type} row list of float values
 * @param {type} callback
 * @returns {undefined}
 */
exports.addRows = function(panelId, rows, callback) {
    cassandraPanel.addRows(panelId, rows, callback);
};



function calculateProcessedPanel(parameters, callbackDone) {
    cassandraPanelProcessor.getPanel(parameters, function(err, panel) {
        callbackDone(err, panel);
        if (typeof err === 'undefined' && parameters.cache === true) {
            cassandraPanel.putCachedProcessedPanel(parameters.id,
                    parameters.startTime, parameters.endTime, parameters.buckets,
                    panel);
        }
    });
}


exports.getProcessedPanel = function(parameters, callbackDone) {
    exports.get({id: parameters.id}, function(panelList) {
        if (panelList.length === 0) {
            callbackDone('panelId "' + parameters.id + '" not a valid panel id.');
            return;
        }
        parameters.panel = panelList[0];

        if (typeof parameters.panel.summaryStatistics === 'undefined'
                || underscore.keys(parameters.panel.summaryStatistics).length === 0) {
            callbackDone('panelId "' + parameters.id + '" does not have summary statistics. Summary statistics required.');
            return;
        }

        if (typeof parameters.startTime === 'undefined') {
            parameters.startTime = parameters.panel.startTime;
        }
        if (typeof parameters.endTime === 'undefined') {
            parameters.endTime = parameters.panel.endTime;
        }

        // Check cache
        cassandraPanel.getCachedProcessedPanel(parameters.id,
                parameters.startTime, parameters.endTime, parameters.buckets,
                function(cache) {
                    if (typeof cache === 'undefined') {
                        calculateProcessedPanel(parameters, callbackDone);
                    } else {
                        // Found cache.
                        callbackDone(undefined, cache);
                    }
                });
    });
};


/** 
 * @param {type} options
 * @param {type} callbackDataset
 * @param {type} callbackData Called once for each row
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getPanelBody = function(options,
        callbackPanelProperties, callbackData, callbackDone) {

    var panelId = options.id;
    var startTime = options.startTime;
    var endTime = options.endTime;
    var axes = options.axes;


    exports.get({id: panelId}, function(panelList) {
        if (panelList.length !== 1) {
            callbackDone('incorrect number of panels ' + panelList.length + ' for ' + panelId);
        } else {
            var panel = panelList[0];

            // TODO: possible slight optimization option: if axes is undefined
            // we want all of them. Let's save it as undefined and just return
            // all later, instead of slicing and dicing.
            if (typeof axes === 'undefined') {
                axes = panel.axes;
            }

            // Limit to just the axes in the panel
            axes = underscore.intersection(axes, panel.axes);

            // Find what index those axis values are at
            var axesIndex = underscore.map(axes, function(axis) {
                return panel.axes.indexOf(axis);
            });

            if (typeof startTime === 'undefined') {
                startTime = panel.startTime;
            }
            if (typeof endTime === 'undefined') {
                endTime = panel.endTime;
            }

            // If we're getting a subset of the "orginal" panel
            panel.startTime = startTime;
            panel.endTime = endTime;

            panel.rowCount = Math.floor((endTime - startTime) / 10) + 1; // TODO: SRLM: This is based on 100Hz panel row frequency, or 10ms between readings. Should remove! Or at least put in config.

            callbackPanelProperties(panel);

            var valueFunction = function(time, values, rowIndex) {
                var resultValues = underscore.map(axesIndex, function(index) {
                    return values[index];
                });
                callbackData(time, resultValues, rowIndex);
            };

            var databaseDoneFunction = function(err) {
                callbackDone(err);
            };

            // Get "plain" panel
            cassandraPanel.getPanel(panelId, startTime, endTime,
                    valueFunction, databaseDoneFunction);
        }
    });
};

