var underscore = require('underscore')._;

var log = requireFromRoot('support/logger').log;
var cassandraDatabase = requireFromRoot('support/datasources/cassandra');

var common = requireFromRoot('support/resourcescommon');

var userResource = {
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    //--------------------------
    email: {
        type: 'string:email',
        includeToCreate: true,
        editable: true
    },
    displayName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    givenName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    familyName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.email = resource.email;
    cassandra.display_name = resource.displayName;
    cassandra.first = resource.givenName;
    cassandra.last = resource.familyName;

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
    resource.email = cassandra.email;
    resource.displayName = cassandra.display_name;
    resource.givenName = cassandra.first;
    resource.familyName = cassandra.last;

    return resource;
}

exports.resource = {
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'user',
    schema: userResource
};


exports.create = function(newUser, callback) {
    common.createResource(exports.resource, newUser, callback);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.update = function(id, modifiedUser, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedUser, callback, forceEditable);
};

exports.get = function(constraints, callback, expand) {
    common.getResource(exports.resource, constraints, callback, expand);
};