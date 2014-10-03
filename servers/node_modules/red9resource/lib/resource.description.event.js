var _ = require('underscore')._;
var VError = require('verror');

var defaultSource = {
    type: 'manual',
    createTime: '', // Overwritten in pre
    algorithm: 'manual',
    parameters: {}
};

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

module.exports = {
    name: 'event',
    tableName: 'event',

    schema: {
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
    },
    checkResource: function (event, callback) {


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
    },


    mapToCassandra: function (resource) {
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
    },

    mapToResource: function (cassandra) {
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
    },

    cassandraMap: { // Needed to map queries from JSON to Cassandra
        id: 'id',
        type: 'type',
        startTime: 'start_time',
        endTime: 'end_time',
        datasetId: 'dataset',
        source: 'source',
        summaryStatistics: 'summary_statistics'
    },

    expand: function (parameters, event, callback) {
        callback(null, event);
    },

    populateDefaults: function (newEvent) {
        // Allow for a default source on new events
        if (typeof newEvent.source === 'undefined') {
            newEvent.source = defaultSource;
            newEvent.source.createTime = (new Date()).getTime();
        }

    },
    populateOnCreate: function(newEvent){
        // Fill in the extras
        newEvent.summaryStatistics = {};
    }
};

// Testing exports
//exports.checkSource = checkSource;