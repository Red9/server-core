var moment = require('moment');
var underscore = require('underscore')._;
var markdown = require('markdown').markdown;

var common = requireFromRoot('support/resourcescommon');

var videoResource = {
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
};

function mapToCassandra(resource) {
    var cassandra = {};


    cassandra.host = resource.host;
    cassandra.host_id = resource.hostId;
    cassandra.id = resource.id;
    cassandra.dataset = resource.dataset;

    if (typeof resource.createTime !== 'undefined') {
        cassandra.create_time = moment(resource.createTime).toDate();
    }
    if (typeof resource.startTime !== 'undefined') {
        cassandra.start_time = moment(resource.startTime).toDate();
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
    resource.dataset = cassandra.dataset;
    resource.host = cassandra.host;
    resource.hostId = cassandra.host_id;
    resource.id = cassandra.id;
    resource.startTime = cassandra.start_time;
    resource.createTime = cassandra.create_time;
    
    return resource;
}


exports.create = function(newComment, callback) {
    common.createResource(exports.resource, newComment, callback);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.update = function(id, modifiedComment, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedComment, callback, forceEditable);
};

exports.get = function(constraints, callback, expand) {
    common.getResource(exports.resource, constraints, callback, expand);
};

var createFlush = function(newComment) {
    newComment.id = common.generateUUID();
    newComment.createTime = moment().valueOf();
};


exports.resource = {
    name:'video',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'video',
    schema: videoResource,
    create: {
        flush: createFlush
    }
};