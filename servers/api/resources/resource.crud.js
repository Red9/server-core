"use strict";

var _ = require('underscore')._;
var Boom = require('boom');
var async = require('async');

var common = require('./resource.common.js');
var commonSearch = require('./resource.common.search.js');
var cassandra = require('./cassandra');

var expandConcurrency = 4;

/**
 *
 * Assumes all input is valid.
 *
 * @todo: there's a bug here: if I pass in an object with extra keys it all get's returned, even if some haven't been actually stored.
 *
 * @param resourceDescription {object}
 * @param newResource {object} resource to create
 * @param callback {function} (err, createdResource)
 * @param [deepMigrate] {bool} Ignore almost always. Set to true to prevent some defaults from being created.
 */
exports.create = function (resourceDescription, newResource, callback, deepMigrate) {
    // Every resource gets a few default fields
    if (deepMigrate !== true) {
        newResource.id = common.generateUUID();
        newResource.createTime = (new Date()).getTime();
    }

    resourceDescription.checkResource(newResource, function (err, finalResource) {
        if (err) {
            callback(err);
            return;
        }

        var t = common.createResourceQuery(
            resourceDescription.tableName,
            resourceDescription.mapping,
            finalResource
        );

        cassandra.execute({
            query: t.query,
            parameters: t.parameters,
            hints: t.hints,
            callback: function (err) {
                callback(err, finalResource);
            }
        });
    });
};

/**
 *
 * @param resourceDescription {object}
 * @param query {object}
 * @param [options] {object}
 * @param [rowCallback] {function} (resource)
 * @param doneCallback {function} (err, rowCount)
 */
exports.find = function (resourceDescription, query, options, rowCallback, doneCallback) {

    // Deal with the optional arguments
    var args = [];
    Array.prototype.push.apply(args, arguments);
    resourceDescription = args.shift();
    query = args.shift();

    doneCallback = args.pop();

    if (args.length === 2) {
        options = args.shift();
        rowCallback = args.shift();
    } else if (args.length === 1) {
        if (_.isFunction(args[0])) {
            options = {};
            rowCallback = args.shift();
        } else {
            options = args.shift();
            rowCallback = function () {
            };
        }
    } else {
        options = {};
        rowCallback = function () {
        };
    }

    // Prepare the expand queue
    var queue = async.queue(function (resource, cb) {
        resourceDescription.expand(options.$expand, resource, function (err, expandedResource) {
            if (err) {
                // TODO: Log error here.
                cb(err);
            } else {
                rowCallback(expandedResource);
                cb(null);
            }
        });
    }, expandConcurrency);

    // Figure out who is taking care of what part of the query
    var dividedQuery = commonSearch.divideQueries(query);
    var cassandraQuery = commonSearch.constructWhereQueryWithParameters(
        resourceDescription.tableName,
        resourceDescription.mapping,
        dividedQuery.cassandra
    );

    // Finally, ask the database for the data
    var rowCount = 0;
    cassandra.execute({
        query: cassandraQuery.query,
        parameters: cassandraQuery.parameters,
        hints: cassandraQuery.hints,
        rowCallback: function (cassandraResource) {
            var resource = commonSearch.mapToResource(resourceDescription.mapping, cassandraResource);

            if (commonSearch.testAgainstQuery(resource, dividedQuery.local)) {
                rowCount++;
                queue.push(resource);
            }
        },
        callback: function (err) {
            if (err) {
                doneCallback(err);
            } else if (rowCount === 0 || queue.idle()) {
                doneCallback(null, rowCount);
            } else {
                queue.drain = function () {
                    doneCallback(null, rowCount);
                };
            }
        }
    });
};

/**
 *
 * We need the full resource so that we can do validation checks.
 *
 * @param resourceDescription {object}
 * @param originalResource {object}
 * @param updatedResource {object}
 * @param callback {function} (err, resultResource)
 */
exports.update = function (resourceDescription, originalResource, updatedResource, callback) {
    // Check to make sure that the resource exists
    // And store it so we can validate the updated resource

    if (_.size(updatedResource) === 0) {
        callback(Boom.badData('Must have at least one value in the updated resource'));
        return;
    }

    var resourceResult = _.extend({}, originalResource, updatedResource);

    resourceDescription.checkResource(resourceResult, function (err) {
        if (err) {
            callback(err);
            return;
        }

        var updateQuery = common.createUpdateQuery(resourceDescription.tableName, resourceDescription.mapping, originalResource.id, updatedResource);

        cassandra.execute({
            query: updateQuery.query,
            parameters: updateQuery.parameters,
            hints: updateQuery.hints,
            callback: function (err) {
                callback(err, resourceResult);
            }
        });

    });
};

/** Deletes the resource, if any. No error thrown if resource does not exist.
 *
 * @param resourceDescription
 * @param id
 * @param callback {function} (err)
 */
exports.delete = function (resourceDescription, id, callback) {
    cassandra.execute({
        query: common.createDeleteQuery(resourceDescription.tableName, id),
        callback: function (err) {
            if (err) {
                callback(err);

            } else if (_.has(resourceDescription, 'remove')) {
                resourceDescription.remove(id, callback);
            } else {
                callback(null);
            }
        }
    });
};

