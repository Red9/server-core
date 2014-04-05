var moment = require('moment');
var underscore = require('underscore')._;
var markdown = require('markdown').markdown;

var common = requireFromRoot('support/resourcescommon');

var userResource = requireFromRoot('support/resources/user');

var commentResource = {
    author: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    resourceType: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    resource: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    body: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
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

    cassandra.author = resource.author;
    cassandra.resource_type = resource.resourceType;
    cassandra.resource = resource.resource;
    cassandra.body = resource.body;
    cassandra.id = resource.id;

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
    resource.author = cassandra.author;
    resource.resourceType = cassandra.resource_type;
    resource.resource = cassandra.resource;
    resource.body = cassandra.body;
    resource.id = cassandra.id;
    resource.startTime = cassandra.start_time;
    resource.endTime = cassandra.end_time;
    resource.createTime = cassandra.create_time;
    
    resource.bodyHtml = markdown.toHTML(resource.body);
    
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

var expandFunctions = {
    author: function(resource, expandCallback){
        userResource.get({id:resource.author}, function(userList){
            if(userList.length === 1){
                resource.author = userList[0];
            }
            expandCallback();
        });
    }
};

exports.resource = {
    name:'comment',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'comment',
    schema: commentResource,
    create: {
        flush: createFlush
    },
    get:{
        expandFunctions:expandFunctions
    }
};