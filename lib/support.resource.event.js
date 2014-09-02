var moment = require('moment');
var common = require('./support.resource.common');
var cassandra = require('./support.datasource.cassandra');

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

    underscore.each(cassandra, function (value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });
    return cassandra;
}


function calculateStar(cse) {
    var range = [
        260.04,
        98.24,
        45.165,
        16.58
    ];
    var i;
    for (i = 0; i < range.length; i++) {
        if (Math.abs(cse) > range[i]) {
            break;
        }
    }

    return range.length - i + 1;
}

function addStars(resource) {
    var result = {};

    try {
        underscore.each(resource.summaryStatistics.static.cse.axes,
            function (cse, axis) {
                result[axis] = calculateStar(cse);
            });
    } catch (e) {
        //log.warn('Caught: ' + e + ', ' + JSON.stringify(resource));
    }
    return result;
}

function mapToResource(cassandra, callback) {
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

    callback(resource);
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
    callback(event);
}

exports.find = function (query, options, rowCallback, doneCallback, errorCallback) {
    if (typeof options === 'undefined') {
        options = {};
    }
    if (typeof rowCallback === 'undefined') {
        rowCallback = function () {
        };
    }
    if (typeof doneCallback === 'undefined') {
        doneCallback = function () {
        };
    }
    if (typeof errorCallback === 'undefined') {
        errorCallback = function () {
        };
    }

    var dividedQuery = common.divideQueries(query);

    var queryString = 'SELECT * FROM event'
        + common.constructWhereQuery(common.mapQueryKeyName(dividedQuery.cassandra, cassandraMap))
        + ' ALLOW FILTERING';

    var pipeline = common.queryTailPipeline(options, expand, rowCallback, doneCallback);

    cassandra.execute({
        query: queryString,
        mapToResource: mapToResource,
        rowCallback: function (resource) {
            if (common.testAgainstQuery(resource, dividedQuery.local)) {
                pipeline.row(resource);
            }
        },
        doneCallback: function () {
            pipeline.done();
        },
        errorCallback: errorCallback
    });
};


exports.create = function (newEvent, doneCallback, errorCallback) {
    // Allow for a default source on new events
    if (typeof newEvent.source === 'undefined') {
        newEvent.source = defaultSource;
        newEvent.source.createTime = (new Date()).getTime();
    }

    // Check the event for validity
    var eventErrors = common.checkNewResource(schema, newEvent);
    if (eventErrors) {
        errorCallback(eventErrors);
        return;
    }

    // Fill in the extras
    newEvent.id = common.generateUUID();
    newEvent.summaryStatistics = {};

    cassandra.executeChange({
        query: common.createResourceString(kTableName, mapToCassandra(newEvent)),
        doneCallback: function () {
            doneCallback(newEvent);
        },
        errorCallback: errorCallback
    });
};


