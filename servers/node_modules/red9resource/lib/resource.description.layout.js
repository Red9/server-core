var underscore = require('underscore')._;


module.exports = {
    name: 'layout',
    tableName: 'layout',

    schema: {
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
        for: {
            type: 'object',
            includeToCreate: true,
            editable: true
        },
        // -------------------------
        id: {
            type: 'uuid',
            includeToCreate: false,
            editable: false
        }
    },

    mapToCassandra: function (resource) {
        var cassandra = {};

        cassandra.id = resource.id;
        cassandra.title = resource.title;
        cassandra.description = resource.description;
        cassandra.layout = JSON.stringify(resource.layout);
        cassandra.for = JSON.stringify(resource.for);

        underscore.each(cassandra, function (value, key) {
            if (typeof value === 'undefined') {
                delete cassandra[key];
            }
        });

        return cassandra;
    },


    mapToResource: function (cassandra) {
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
    },
    checkResource: function (layout, callback) {
        callback(null);
    }
};

