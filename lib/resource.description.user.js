var _ = require('underscore')._;

module.exports = {
    name: 'user',
    tableName: 'user',
    schema: {
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
        //--------------------------
        preferredLayout: {
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

    mapToCassandra: function (resource) {
        var cassandra = {};

        cassandra.id = resource.id;
        cassandra.email = resource.email;
        cassandra.display_name = resource.displayName;
        cassandra.first = resource.givenName;
        cassandra.last = resource.familyName;
        cassandra.preferred_layout = JSON.stringify(resource.preferredLayout);

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

        return resource;
    },

    cassandraMap: {
        id: 'id',
        email: 'email',
        displayName: 'display_name',
        givenName: 'first',
        familyName: 'last',
        preferredLayout: 'preferred_layout'
    },
    checkResource: function (user, callback) {
        // TODO(SRLM): Add some checks here:
        // - email is valid
        // - name is valid (no odd characters)
        // - email does not exist
        // - make sure preferred layout is valid

        callback(null);
    },
    expand: function (parameters, user, callback) {
        callback(null, user);
    },
    populateDefaults: function (newUser) {

    },
    populateOnCreate: function (newUser) {
        // TODO(SRLM): Add in a better preferred layout here.
        newUser.preferredLayout = {};
    }
};