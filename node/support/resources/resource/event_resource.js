var underscore = require('underscore')._;
var moment = require('moment');
var validator = require('validator');
var async = require('async');

var common = require('./../common');
var cassandraDatabase = require('./../datasources/cassandra');

var summaryStatisticsResource = require('./summarystatistics_resource');

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
    var valid = common.checkNewResourceAgainstSchema(eventResource, newEvent);
    if (typeof valid !== 'undefined') {
        callback('Schema failed: ' + valid);
        return;
    }

    newEvent.id = common.generateUUID();
    newEvent.summaryStatistics = {};

    var cassandraEvent = mapToCassandra(newEvent);

    cassandraDatabase.addSingle('event', cassandraEvent, function(err) {
        if (err) {
            console.log("EventResource: Error adding. " + err);
            callback();
        } else {
            console.log("successfully created event");
            callback(undefined, [newEvent]);
            summaryStatisticsResource.calculate(newEvent.datasetId, newEvent.startTime, newEvent.endTime, function(statistics) {
                exports.updateEvent(newEvent.id, {summaryStatistics: statistics}, function(err) {
                    if (err) {
                        console.log('Error updating event with summaryStatistics' + err);
                    }
                });
            });
        }
    });
};

exports.deleteEvent = function(id, callback) {
    if (validator.isUUID(id) === true) {
        cassandraDatabase.deleteSingle('event', id, function(err) {
            callback(err);
        });
    } else {
        callback('Given id is not version 4 UUID ("' + id + '")');
    }
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

exports.updateEvent = function(id, modifiedEvent, callback, forceEditable) {
    //------------------------------------------------------------------
    //TODO(SRLM): Make sure that the event exists!
    //------------------------------------------------------------------

    if (typeof id === 'undefined' || validator.isUUID(id) === false) {
        callback('Must include valid ID');
        return;
    }

    underscore.each(modifiedEvent, function(value, key) {
        if (key in eventResource === false
                || (eventResource[key].editable === false
                && forceEditable !== true)
                || key === 'id') {
            delete modifiedEvent[key];
        }
    });

    if (modifiedEvent.length === 0) {
        callback('Must include at least one editable item');
        return;
    }

    var cassandraEvent = mapToCassandra(modifiedEvent);

    cassandraDatabase.updateSingle('event', id, cassandraEvent, function(err) {
        if (err) {
            console.log('error updating event: ' + err);
            callback('error');
        } else {
            callback(undefined, modifiedEvent);
        }
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