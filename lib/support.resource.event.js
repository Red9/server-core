var moment = require('moment');
var common = require('./support.resource.common');
var cassandra = require('./support.datasource.cassandra');
var _ = require('underscore')._;
var VError = require('verror');

var defaultSource = {
    type: 'manual',
    createTime: '', // Overwritten in pre
    algorithm: 'manual',
    parameters: {}
};

var schema = {
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
    source: {
        type: 'object',
        includeToCreate: true,
        editable: true
    },
    //-------------------------
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

var kTableName = 'event';

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.dataset = resource.datasetId;
    cassandra.summary_statistics = JSON.stringify(resource.summaryStatistics);
    cassandra.type = resource.type;
    cassandra.source = JSON.stringify(resource.source);

    // Times must be in milliseconds or undefined
    cassandra.start_time = resource.startTime;
    cassandra.end_time = resource.endTime;

    _.each(cassandra, function (value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });
    return cassandra;
}

function mapToResource(cassandra, callback) {
    var resource = {};

    resource.id = cassandra.id;
    resource.datasetId = cassandra.dataset;
    resource.endTime = cassandra.end_time.getTime();
    resource.startTime = cassandra.start_time.getTime();

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
    return resource;
}


var cassandraMap = {
    id: 'id',
    type: 'type',
    startTime: 'start_time',
    endTime: 'end_time',
    datasetId: 'dataset',
    source: 'source',
    summaryStatistics: 'summary_statistics'
};

function expand(parameters, event, callback) {
    callback(null, event);
}

function checkSource(source) {
    var sourceTypes = ['manual', 'auto'];
    if (!_.isObject(source)) {
        return new VError('source must be an object');
    } else if (!_.has(source, 'type')) {
        return new VError('source must have a type field');
    } else if (_.indexOf(sourceTypes, source.type) === -1) {
        return new VError('source type must be one of %s', sourceTypes.join(','));
    }
}

function checkEvent(event, callback) {


    if (event.startTime >= event.endTime) {
        callback(new VError('event startTime %s is greater than or equal to event endTime %s', event.startTime, event.endTime));
        return;
    }

    var sourceError = checkSource(event.source);
    if (sourceError) {
        callback(sourceError);
        return;
    }
    callback(null);

    /*
     // TODO(SRLM): This code is waiting until the dataset resource is completed.
     var dataset;
     resource.dataset.find({id: event.datasetId}, null,
     function (foundDataset) {
     // Store it here so that we don't have to worry about calling callback multiple times
     dataset = foundDataset;
     },
     function (err, rowCount) {
     if (err) {
     callback(err);
     }else if(rowCount !== 1){
     callback(new VError('No dataset match (%s)', rowCount);
     } else if (event.startTime < dataset.startTime) {
     callback(new VError('Event startTime %s is less than dataset start time %s', event.startTime, event.endTime));
     } else if (event.endTime > dataset.endTime) {
     callback(new VError('Event endTime %s is more than dataset end time %s', event.endTime, dataset.endTime));
     } else {
     callback(null);
     }
     });
     */
}

/**
 *
 * @param query
 * @param options
 * @param rowCallback
 * @param callback (err, totalRows)
 */
exports.find = function (query, options, rowCallback, callback) {
    if (typeof options === 'undefined') {
        options = {};
    }
    if (!_.isFunction(rowCallback)) {
        rowCallback = function () {
        };
    }
    if (!_.isFunction(callback)) {
        throw new VError('must define a function callback');
    }

    var dividedQuery = common.divideQueries(query);

    var queryString = 'SELECT * FROM event'
        + common.constructWhereQuery(common.mapQueryKeyName(dividedQuery.cassandra, cassandraMap))
        + ' ALLOW FILTERING';

    var pipeline = common.queryTailPipeline(options, expand, rowCallback, callback);

    cassandra.execute({
        query: queryString,
        mapToResource: mapToResource,
        rowCallback: function (resource) {
            if (common.testAgainstQuery(resource, dividedQuery.local)) {
                pipeline.row(resource);
            }
        },
        callback: function (err) {
            if (err) {
                callback(err);
            } else {
                // At this point the pipeline will call the done callback
                pipeline.done();
            }
        }

    });
};


exports.create = function (newEvent, callback) {
    // Allow for a default source on new events
    if (typeof newEvent.source === 'undefined') {
        newEvent.source = defaultSource;
        newEvent.source.createTime = (new Date()).getTime();
    }

    // Check the event schema for validity
    try {
        common.checkNewResourceAgainstSchema(schema, newEvent);
    } catch (e) {
        callback(e);
        return;
    }


    /* TODO(SRLM): check the event itself for validity:
     - startTime, endTime is valid
     - datasetId is valid
     - source is a valid format
     */


    // Fill in the extras
    newEvent.id = common.generateUUID();
    newEvent.summaryStatistics = {};

    checkEvent(newEvent, function (err) {
        if (err) {
            callback(err);
            return;
        }
        cassandra.execute({
            query: common.createResourceString(kTableName, mapToCassandra(newEvent)),
            callback: function (err) {
                if (err !== null) {
                    callback(err);
                } else {
                    callback(null, newEvent);
                }
            }
        });
    });
};

/**
 *
 * @param id
 * @param updatedEvent can be entire event (non-editable keys will be ignored). Must have at least one editable key
 * @param callback {function} (err)
 */
exports.update = function (id, updatedEvent, callback) {
    try {
        // Check and remove out the unwanted bits...
        updatedEvent = common.filterUpdatedResourceThroughSchema(schema, updatedEvent);

        // Need to create this out here so that the catch can catch...
        var queryString = common.createUpdateString(kTableName, id, mapToCassandra(updatedEvent));

        // TODO(SRLM): Do the same event checks as in create


        // Check to make sure that the event exists
        // And store it so we can validate the updated event
        var event;
        exports.find({id: id}, null,
            function (foundEvent) {
                event = foundEvent;
            },
            function (err, rowCount) {
                if (err) {
                    callback(err);
                } else if (rowCount !== 1) {
                    callback(new VError('%s %s does not exist (%s results found)', kTableName, id, rowCount));
                } else {
                    checkEvent(_.extend(event, updatedEvent), function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            cassandra.execute({
                                query: queryString,
                                callback: callback
                            });
                        }
                    });
                }
            });
    } catch (e) {
        callback(e);
    }
};

/** DELETE from database
 *
 * @param id
 * @param callback {function} (err, deletedResource)
 */
exports.delete = function (id, callback) {
    var resource;
    exports.find({id: id}, null,
        function (t) {
            resource = t;
        },
        function (err, rowCount) {
            if (err) {
                callback(err);
            } else if (rowCount !== 1) {
                callback(new VError('%s %s does not exist (%s results found)', kTableName, id, rowCount));
            } else {
                cassandra.execute({
                    query: common.createDeleteString(kTableName, id),
                    callback: function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, resource);
                        }
                    }
                });
            }
        });
};


// Testing exports
exports.checkSource = checkSource;
exports.checkEvent = checkEvent;