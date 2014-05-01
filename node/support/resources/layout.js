var underscore = require('underscore')._;
var common = requireFromRoot('support/resourcescommon');

var layoutResource = {
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    title: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    description: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    layout: {
        type: 'object',
        includeToCreate: true,
        editable: true
    },
    for : {
        type: 'object',
        includeToCreate: true,
        editable: true
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.title = resource.title;
    cassandra.description = resource.description;
    cassandra.layout = JSON.stringify(resource.layout);
    cassandra.for = JSON.stringify(resource.for);

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
    resource.title = cassandra.title;
    resource.description = cassandra.description;

    try {
        resource.layout = JSON.parse(cassandra.layout);
    } catch (e) {
        resource.layout = {};
    }

    try {
        resource.for = JSON.parse(cassandra.for);
    } catch (e) {
        resource.for = {};
    }

    return resource;
}

var createFlush = function(newLayout) {
    newLayout.id = common.generateUUID();
};


exports.resource = {
    name: 'layout',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'layout',
    schema: layoutResource,
    create: {
        flush: createFlush
    }
};

exports.create = function(newLayout, callback) {
    common.createResource(exports.resource, newLayout, callback);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.update = function(id, modifiedLayout, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedLayout, callback, forceEditable);
};

exports.get = function(constraints, callback, expand) {
    common.getResource(exports.resource, constraints, callback, expand);
};