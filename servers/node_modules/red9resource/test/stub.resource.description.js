var _ = require('underscore')._;
var VError = require('verror');

/**
 * Based on the event resource
 *
 */

module.exports = {
    name: 'event',
    tableName: 'event',

    schema: {
        time: {
            type: 'timestamp',
            includeToCreate: true,
            editable: true
        },
        type: {
            type: 'string',
            includeToCreate: true,
            editable: true
        },
        //-------------------------
        id: {
            type: 'uuid',
            includeToCreate: false,
            editable: false
        }
    },
    checkResource: function (event, callback) {
        if (event.time < 0) {
            callback(new VError('time %s is greater than or equal to event 0', event.time));
            return;
        }
        callback(null);
    },


    mapToCassandra: function (resource) {
        var cassandra = {};

        cassandra.id = resource.id;
        cassandra.type = resource.type;

        // Times must be in milliseconds or undefined
        cassandra.time = resource.time;

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
        resource.time = cassandra.time;
        resource.type = cassandra.type;

        return resource;
    },

    cassandraMap: { // Needed to map queries from JSON to Cassandra
        id: 'id',
        type: 'type',
        time: 'time'
    },

    expand: function (parameters, event, callback) {
        callback(null, event);
    },

    populateDefaults: function (newEvent) {
    },
    populateOnCreate: function (newEvent) {
        // Fill in the extras
    }
};