var underscore = require('underscore')._;
var moment = require('moment');
var async = require('async');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var log = requireFromRoot('support/logger').log;

var common = requireFromRoot('support/resourcescommon');
var useful = requireFromRoot('support/useful');

var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');
var datasetResource = requireFromRoot('support/resources/dataset');

var defaultSource = {
    type: 'manual',
    createTime: '', // Overwritten in pre
    algorithm: 'manual',
    parameters: {}
};

var eventResource = {
    startTime: {
        type: 'timestamp',
        includeToCreate: true,
        editable: true
    },
    endTime: {
        type: 'timestamp',
        includeToCreate: true,
        editable: true
    },
    type: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    datasetId: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    //-------------------------
    source: {
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    summaryStatistics: {
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset = resource.datasetId;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);
    cassandra.type = resource.type;
    cassandra.source = JSON.stringify(resource.source);

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



function calculateStar(cse) {
    var maximum = 1000;
    var range = [
        maximum * 0.9,
        maximum * 0.8,
        maximum * 0.5,
        maximum * 0.3
    ];
    var i;
    for (i = 0; i < range.length; i++) {
        if (cse > range[i]) {
            break;
        }
    }

    return range.length - i + 1;
}

function addStars(resource) {
    var result = {};

    try {
        underscore.each(resource.summaryStatistics.static.cse.axes,
                function(cse, axis) {
                    result[axis] = calculateStar(cse);
                });
    } catch (e) {
        //log.warn('Caught: ' + e + ', ' + JSON.stringify(resource));
    }
    return result;
}

function mapToResource(cassandra) {
    var resource = {};

    resource.id = cassandra.id;
    resource.datasetId = cassandra.dataset;
    resource.endTime = cassandra.end_time;
    resource.startTime = cassandra.start_time;

    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        // Catch if it is undefined.
        resource.summaryStatistics = {};
    }

    try {
        resource.source = JSON.parse(cassandra.source);
    } catch (e) {
        resource.source = {};
    }

    resource.type = cassandra.type;


    resource.stars = addStars(resource);

    return resource;
}


/** Must follow the eventResource template.
 * 
 * @param {type} newEvent
 * @param {type} callback
 * @returns {unresolved}
 */
exports.create = function(newEvent, callback) {
    common.createResource(exports.resource, newEvent, callback);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.update = function(id, modifiedEvent, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedEvent, callback, forceEditable);
};

exports.deleteEventByDataset = function(datasetId, callback) {
    exports.get({datasetId: datasetId}, function(events) {
        async.each(events,
                function(event, asyncCallback) {
                    exports.delete(event.id, asyncCallback);
                },
                function(err) {
                    callback(err);
                });
    });
};

/**
 * @param {type} constraints
 * @param {type} callback
 * @returns {undefined} Returns an array of event.
 * 
 */
exports.get = function(constraints, callback, expand) {
    //TODO(SRLM): Can we add "Get Events by Dataset" for efficiency?
    common.getResource(exports.resource, constraints, callback, expand);
};

function createFlush(newEvent) {
    newEvent.id = useful.generateUUID();
    newEvent.summaryStatistics = {};
}

function createPre(newEvent, callback) {
    if (typeof newEvent.source === 'undefined') {
        newEvent.source = defaultSource;
    }

    newEvent.source.createTime = (new Date()).getTime();

    callback(true);
}

function createPost(newEvent) {
    datasetResource.get({id: newEvent.datasetId}, function(datasetList) {
        var dataset = datasetList[0];
        summaryStatisticsResource.calculate(dataset.headPanelId, newEvent.startTime, newEvent.endTime, function(statistics) {
            exports.update(newEvent.id, {summaryStatistics: statistics}, function(err) {
                if (err) {
                    log.error('Error updating event with summaryStatistics' + err);
                }
            });
        });
    });
}

exports.resource = {
    name: 'event',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'event',
    schema: eventResource,
    create: {
        pre: createPre,
        flush: createFlush,
        post: createPost
    }
};


