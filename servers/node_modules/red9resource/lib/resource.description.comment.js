var moment = require('moment');
var _ = require('underscore')._;
var markdown = require('markdown').markdown;

module.exports = {
    name: 'comment',
    tableName: 'comment',
    schema: {
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
        },
        //---------------------------
        bodyHtml: {
            type: 'string',
            dynamic: true
        }
    },
    cassandraMap: {
        author: 'author',
        resourceType: 'resource_type',
        resource: 'resource',
        body: 'body',
        id: 'id',
        createTime: 'create_time',
        startTime: 'start_time',
        endTime: 'end_time'

    },
    mapToCassandra: function (resource) {
        var cassandra = {};

        cassandra.author = resource.author;
        cassandra.resource_type = resource.resourceType;
        cassandra.resource = resource.resource;
        cassandra.body = resource.body;
        cassandra.id = resource.id;

        // Times must be in milliseconds or undefined
        cassandra.create_time = resource.createTime;
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
        resource.author = cassandra.author;
        resource.resourceType = cassandra.resource_type;
        resource.resource = cassandra.resource;
        resource.body = cassandra.body;
        resource.id = cassandra.id;
        resource.startTime = cassandra.start_time.getTime();
        resource.endTime = cassandra.end_time.getTime();
        resource.createTime = cassandra.create_time.getTime();

        return resource;
    },
    checkResource: function (comment, callback) {
        /* TODO(CHECK):
         startTime <= endTime
         author invalid
         body is empty
         resourceType is invalid
         resource does not exist
         if startTime and endTime are defined then must be valid for dataset
         */
        callback(null);
    },
    populateDefaults: function (newComment) {
        if (typeof newComment.startTime === 'undefined') {
            newComment.startTime = 0;
        }
        if (typeof newComment.endTime === 'undefined') {
            newComment.endTime = 0;
        }
    },
    populateOnCreate: function (newComment) {
        newComment.createTime = moment().valueOf();
    },
    populateDynamic: function (comment) {
        comment.bodyHtml = markdown.toHTML(comment.body);
        return comment;
    },
    expand: function (parameters, comment, callback) {
        callback(null, comment);
//        var expandFunctions = {
//            author: function(resource, expandCallback) {
//                userResource.get({id: resource.author}, function(userList) {
//                    if (userList.length === 1) {
//                        resource.author = userList[0];
//                    }
//                    expandCallback();
//                });
//            }
//        };
    }
};
