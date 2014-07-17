var underscore = require('underscore')._;
var common = requireFromRoot('support/resourcescommon');
var useful = requireFromRoot('support/useful');

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
    },
    preferredLayout: {
        type: 'object',
        includeToCreate: false,
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
    cassandra.preferred_layout = JSON.stringify(resource.preferredLayout);

    underscore.each(cassandra, function(value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });

    return cassandra;
}

function mapToResource(cassandra, callback) {
    var resource = {};

    resource.id = cassandra.id;
    resource.email = cassandra.email;
    resource.displayName = cassandra.display_name;
    resource.givenName = cassandra.first;
    resource.familyName = cassandra.last;

    try {
        resource.preferredLayout = cassandra.preferred_layout === null ? {} :
                JSON.parse(cassandra.preferred_layout);
    } catch (e) {
        resource.preferredLayout = {};
    }

    callback(resource);
}

var createFlush = function(newUser) {
    newUser.id = useful.generateUUID();
};

exports.resource = {
    name: 'user',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'user',
    schema: userResource,
    create: {
        flush: createFlush
    }
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