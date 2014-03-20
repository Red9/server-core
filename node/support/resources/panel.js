var moment = require('moment');
var validator = require('validator');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var cassandraPanel = requireFromRoot('support/datasources/cassandra_panel');

var common = requireFromRoot('support/resourcescommon');
var datasetResource = requireFromRoot('support/resources/dataset');

var underscore = require('underscore')._;

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
        editable: false
    },
    endTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    },
    summaryStatistics: {
        type: 'resource:summaryStatistics',
        includeToCreate: false,
        editable: false
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset_id = resource.datasetId;
    cassandra.columns = resource.axes;
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

function mapToResource(cassandra) {
    var resource = {};
    resource.id = cassandra.id;
    resource.datasetId = cassandra.dataset_id;
    resource.axes = cassandra.columns;
    resource.createTime = moment(cassandra.create_time).valueOf();
    resource.startTime = moment(cassandra.start_time).valueOf();
    resource.endTime = moment(cassandra.end_time).valueOf();

    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        resource.summaryStatistics = {};
    }

    return resource;
}

function createFlush(newPanel) {
    newPanel.id = common.generateUUID();
    newPanel.createTime = moment().valueOf();
    newPanel.startTime = moment().valueOf();// Default to now
    newPanel.endTime = moment().valueOf();// Default to now
    newPanel.summaryStatistics = {};
    newPanel.axes = [];
}

function deletePost(id) {
    cassandraPanel.deletePanel(id, function() {
    });
}


exports.resource = {
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
 * @param {type} callback ({ } ) Calls with an object with the calculated properties.
 * @returns {undefined}
 */
exports.calculatePanelProperties = function(panelId, callback) {
    cassandraPanel.calculatePanelProperties(panelId, callback);
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

/** 
 * TODO(SRLM): Add callback axes?
 * @param {type} options
 * @param {type} callbackDataset
 * @param {type} callbackData
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getPanelBody = function(options,
        callbackPanelProperties, callbackData, callbackDone) {

    var panelId = options.id;
    var startTime = options.startTime;
    var endTime = options.endTime;
    var minmax = options.minmax;
    var cache = options.cache;
    var buckets = options.buckets;
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

            callbackPanelProperties(panel);


            if (typeof startTime === 'undefined') {
                startTime = panel.startTime;
            }
            if (typeof endTime === 'undefined') {
                endTime = panel.endTime;
            }
            if (underscore.isBoolean(minmax) === false) {
                minmax = false;
            }
            if (underscore.isBoolean(cache) === false) {
                cache = false;
            }



            var valueFunction = function(time, values, rowIndex) {
                var resultValues = underscore.map(axesIndex, function(index) {
                    return values[index];
                });
                callbackData(time, resultValues, rowIndex);
            };

            var databaseDoneFunction = function(err) {
                callbackDone(err);
            };

            if (typeof buckets === 'undefined') {
                // Get "plain" panel
                cassandraPanel.getPanel(panelId, startTime, endTime,
                        valueFunction, databaseDoneFunction);
            }
            else { // Get bucketed panel
                cassandraPanel.getBucketedPanel(panelId, startTime, endTime,
                        buckets, minmax, cache,
                        valueFunction, databaseDoneFunction);
            }

        }
    });
};

