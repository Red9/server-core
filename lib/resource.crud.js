var moment = require('moment');
var common = require('./resource.common.js');
var cassandra = require('./support.datasource.cassandra');
var _ = require('underscore')._;
var VError = require('verror');


exports.create = function (resourceDescription, newResource, callback) {
    if (_.isFunction(resourceDescription.populateDefaults)) {
        resourceDescription.populateDefaults(newResource);
    }

    // Check the schema for validity
    try {
        common.checkNewResourceAgainstSchema(resourceDescription.schema, newResource);
    } catch (e) {
        callback(e);
        return;
    }

    // Every resource gets an ID
    newResource.id = common.generateUUID();
    if (_.isFunction(resourceDescription.populateOnCreate)) {
        resourceDescription.populateOnCreate(newResource);
    }

    resourceDescription.checkResource(newResource, function (err) {
        if (err) {
            callback(err);
            return;
        }
        cassandra.execute({
            query: common.createResourceString(resourceDescription.tableName, resourceDescription.mapToCassandra(newResource)),
            callback: function (err) {
                if (err !== null) {
                    callback(err);
                } else {
                    callback(null, newResource);
                }
            }
        });
    });
};

/**
 *
 * @param query
 * @param options
 * @param rowCallback
 * @param callback (err, totalRows)
 */
exports.find = function (resourceDescription, query, options, rowCallback, callback) {
    if (typeof options === 'undefined') {
        options = {};
    }
    if (!_.isFunction(rowCallback)) {
        rowCallback = function () {
        };
    }
    if (!_.isFunction(callback)) {
        throw new VError('must define a callback function');
    }
    var dividedQuery = common.divideQueries(query);

    var queryString = 'SELECT * FROM ' + resourceDescription.tableName
        + common.constructWhereQuery(common.mapQueryKeyName(dividedQuery.cassandra, resourceDescription.cassandraMap))
        + ' ALLOW FILTERING';

    var pipeline = common.queryTailPipeline(options, resourceDescription.expand, rowCallback, callback);

    cassandra.execute({
        query: queryString,
        rowCallback: function (cassandraResource) {
            var resource = resourceDescription.mapToResource(cassandraResource);
            if (_.isFunction(resourceDescription.populateDynamic)) {
                resource = resourceDescription.populateDynamic(resource);
            }

            if (common.testAgainstQuery(resource, dividedQuery.local)) {
                pipeline.row(resource);
            }
        },
        callback: function (err) {
            if (err) {
                callback(err);
            } else {
                // At this point the pipeline will call the done callback
                pipeline.done();
            }
        }

    });
};


exports.update = function (find, resourceDescription, id, updatedResource, callback) {
    try {
        // Check and remove out the unwanted bits...
        updatedResource = common.filterUpdatedResourceThroughSchema(resourceDescription.schema, updatedResource);

        // Need to create this out here so that the catch can catch...
        var queryString = common.createUpdateString(resourceDescription.tableName, id, resourceDescription.mapToCassandra(updatedResource));

        // Check to make sure that the event exists
        // And store it so we can validate the updated event
        var resourceTemp;
        find({id: id}, null,
            function (foundResource) {
                resourceTemp = foundResource;
            },
            function (err, rowCount) {
                if (err) {
                    callback(err);
                } else if (rowCount !== 1) {
                    callback(new VError('%s %s does not exist (%s results found)', resourceDescription.tableName, id, rowCount));
                } else {
                    resourceDescription.checkResource(_.extend(resourceTemp, updatedResource), function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            cassandra.execute({
                                query: queryString,
                                callback: callback
                            });
                        }
                    });
                }
            });
    } catch (e) {
        callback(e);
    }
};

exports.delete = function (find, resourceDescription, id, callback) {
    var resource;
    find({id: id}, null,
        function (t) {
            resource = t;
        },
        function (err, rowCount) {
            if (err) {
                callback(err);
            } else if (rowCount !== 1) {
                callback(new VError('%s %s does not exist (%s results found)', resourceDescription.tableName, id, rowCount));
            } else {
                cassandra.execute({
                    query: common.createDeleteString(resourceDescription.tableName, id),
                    callback: function (err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, resource);
                        }
                    }
                });
            }
        });
};

