var underscore = require('underscore')._;
var moment = require('moment');
var validator = require('validator');
var async = require('async');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var log = requireFromRoot('support/logger').log;

var common = requireFromRoot('support/resourcescommon');

var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

var datasetResource = requireFromRoot('support/resources/dataset');

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
    summaryStatistics: {
        type: 'resource:summaryStatistics',
        includeToCreate: false,
        editable: true
    },
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    }
};
exports.schema = eventResource;



function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset = resource.datasetId;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);
    cassandra.type = resource.type;


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
    resource.datasetId = cassandra.dataset;
    resource.endTime = cassandra.end_time;
    resource.startTime = cassandra.start_time;

    try {
        resource.summaryStatistics = JSON.parse(cassandra.summary_statistics);
    } catch (e) {
        // Catch if it is undefined.
        resource.summaryStatistics = {};
    }
    resource.type = cassandra.type;

    return resource;
}


/** Must follow the eventResource template.
 * 
 * @param {type} newEvent
 * @param {type} callback
 * @returns {unresolved}
 */
exports.createEvent = function(newEvent, callback) {
    common.createResource(exports.resource, newEvent, callback);
};

exports.deleteEvent = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.updateEvent = function(id, modifiedEvent, callback, forceEditable) {
   common.updateResource(exports.resource, id, modifiedEvent, callback, forceEditable);
};

exports.deleteEventByDataset = function(datasetId, callback) {
    exports.getEvents({datasetId: datasetId}, function(events) {
        async.each(events,
                function(event, asyncCallback) {
                    exports.deleteEvent(event.id, asyncCallback);
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
exports.getEvents = function(constraints, callback) {
    //TODO(SRLM): Add check: if just a single dataset (given by ID) then do a direct search for that.
    //TODO(SRLM): Can we add "Get Events by Dataset" for efficiency?
    var result = [];
    cassandraDatabase.getAll('event',
            function(cassandraEvent) {
                var event = mapToResource(cassandraEvent);
                if (common.CheckConstraints(event, constraints) === true) {
                    result.push(event);
                } else {
                    // Event failed constraints.
                }
            },
            function(err) {
                callback(result);
            }
    );
};

var createFlush = function(newEvent) {
    newEvent.id = common.generateUUID();
    newEvent.summaryStatistics = {};
};

var createPost = function(newEvent) {
    datasetResource.getDatasets({id: newEvent.datasetId}, function(datasetList) {
        var dataset = datasetList[0];
        summaryStatisticsResource.calculate(dataset.id, dataset.headPanelId, newEvent.startTime, newEvent.endTime, function(statistics) {
            exports.updateEvent(newEvent.id, {summaryStatistics: statistics}, function(err) {
                if (err) {
                    log.error('Error updating event with summaryStatistics' + err);
                }
            });
        });
    });
};

exports.resource = {
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'event',
    schema: eventResource,
    create: {
        flush: createFlush,
        post: createPost
    },
    search: {

    },
    update: {

    },
    delete: {
        
    }




};


