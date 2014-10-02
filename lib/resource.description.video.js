var moment = require('moment');
var _ = require('underscore')._;

module.exports = {
    name: 'video',
    tableName: 'video',
    schema: {
        // TODO: Convert this to datasetId
        dataset: {
            type: 'uuid',
            includeToCreate: true,
            editable: true
        },
        host: {
            type: 'string',
            includeToCreate: true,
            editable: true
        },
        hostId: {
            type: 'string',
            includeToCreate: true,
            editable: true
        },
        startTime: {
            type: 'timestamp',
            includeToCreate: true,
            editable: true
        },
        //---------------------------
        id: {
            type: 'uuid',
            includeToCreate: false,
            editable: false
        },
        createTime: {
            type: 'timestamp',
            includeToCreate: false,
            editable: false
        }
    },

    mapToCassandra: function (resource) {
        var cassandra = {};


        cassandra.host = resource.host;
        cassandra.host_id = resource.hostId;
        cassandra.id = resource.id;
        cassandra.dataset = resource.dataset;
        cassandra.create_time = resource.createTime;
        cassandra.start_time = resource.startTime;

        _.each(cassandra, function (value, key) {
            if (typeof value === 'undefined') {
                delete cassandra[key];
            }
        });
        return cassandra;
    },

    mapToResource: function (cassandra) {
        var resource = {};
        resource.dataset = cassandra.dataset;
        resource.host = cassandra.host;
        resource.hostId = cassandra.host_id;
        resource.id = cassandra.id;
        resource.startTime = cassandra.start_time.getTime();
        resource.createTime = cassandra.create_time.getTime();

        return resource;
    },

    cassandraMap: {
        id: 'id',
        dataset: 'dataset',
        host: 'host',
        hostId: 'host_id',
        startTime: 'start_time',
        createTime: 'create_time'
    },

    checkResource: function (video, callback) {
        // TODO(SRLM): Add checks:
        // - dataset must exist
        // - startTime < dataset endTime
        // - startTime > dataset startTime - N hours (allow for starting a little bit before
        // - host and hostID are valid (and exist and are public)

        callback(null);
    },
    populateOnCreate: function (newVideo) {
        newVideo.createTime = moment().valueOf();
    }
};