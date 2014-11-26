"use strict";

/**
 * @file Master file to provide access to resources.
 *
 * This is the file that you'll want to require whne you need access to a resource.
 *
 */


var createUpdateRetryCount = 25;
var retryDelay = 250;


var _ = require('underscore')._;
var Boom = require('boom');
var async = require('async');
var nconf = require('nconf');

var crud = require('./resource.crud.js');
var collection = require('./resource.common.collection.set.js');
var eventDescription = require('./resource.description.event');
var userDescription = require('./resource.description.user');
var commentDescription = require('./resource.description.comment');
var videoDescription = require('./resource.description.video');
var layoutDescription = require('./resource.description.layout');
var datasetDescription = require('./resource.description.dataset');

var panel = require('./resource.description.panel');
exports.panel = panel;
panel.setResources(exports);


var server; // Populated on init.
/**
 *
 * @param server_ {Object}
 * @param callback {Function} (err)
 */
exports.init = function (server_, callback) {
    server = server_;
    panel.setServer(server);

    exports[eventDescription.name] = addResource(eventDescription);
    exports[userDescription.name] = addResource(userDescription);
    exports[commentDescription.name] = addResource(commentDescription);
    exports[videoDescription.name] = addResource(videoDescription);
    exports[layoutDescription.name] = addResource(layoutDescription);
    exports[datasetDescription.name] = addResource(datasetDescription);

    require('./cassandra').init(callback);
};

/**
 *
 * @param resourceDescription {Object}
 * @returns {Object}
 */
function addResource(resourceDescription) {
    var result = {};

    result.name = resourceDescription.name;
    result.models = resourceDescription.models;
    result.scopes = resourceDescription.scopes;

    /**
     *
     * Assumes all input is valid.
     *
     * @param newResource {Object} resource to create
     * @param callback {Function} (err, createdResource)
     * @param [deepMigrate] {Boolean} Almost never use this. Set to true to prevent some defaults from being created.
     */
    result.create = function (newResource, callback, deepMigrate) {
        crud.create(resourceDescription, newResource, callback, deepMigrate);
    };

    /**
     *
     * @param query {Object}
     * @param [options] {Object}
     * @param [rowCallback] {Function} (resource)
     * @param doneCallback {Function} (err, rowCount)
     */
    result.find = function (query, options, rowCallback, doneCallback) {
        crud.find(resourceDescription, query, options, rowCallback, doneCallback);
    };


    function findById(id, callback) {
        var result = null;
        crud.find(resourceDescription, {id: id}, {},
            function (result_) {
                result = result_;
            }, function (err, resultCount) {
                callback(err, result);
            });
    }

    server.method('resources.' + result.name + '.getById', findById, {
        cache: nconf.get('cache:getById')
    });

    /** Handy function to get a single resource of a specified type
     *
     * @param id {String}
     * @param doneCallback {Function} (err, resultResource)
     */
    result.findById = function (id, doneCallback) {
        server.methods.resources[result.name].getById(id, doneCallback);
    };


    /** Update a resource's fields
     *
     * @param id {String}
     * @param resourceUpdate {Object}
     * @param callback {Function} (err, updatedResource)
     */
    result.update = function (id, resourceUpdate, callback) {
        // We need the full resource so that we can do validation checks.
        var originalResource;
        result.find({id: id}, {},
            function (temp) {
                originalResource = temp;
            },
            function (err, rowCount) {
                if (rowCount === 1) {
                    crud.update(resourceDescription, originalResource, resourceUpdate, callback);
                } else {
                    callback(Boom.notFound());
                }
            });
    };

    /** Delete a resource instance from the database
     *
     * No error if resource doesn't exist.
     *
     * @param id
     * @param callback {Function} (err)
     */
    result.delete = function (id, callback) {
        crud.delete(resourceDescription, id, callback);
    };

    result.collection = {};

    /**
     *
     * @param id {String} Resource UUID
     * @param key {String} Collection key (ex. tags)
     * @param values {Array.<String>} New values to add
     * @param callback {Function} (err)
     */
    result.collection.add = function (id, key, values, callback) {
        collection.add(resourceDescription, id, key, values, callback);
    };

    /**
     *
     * @param id {String} Resource UUID
     * @param key {String} Collection key (ex. tags}
     * @param values {Array.<String>} New values to remove
     * @param callback {Function} (err)
     */
    result.collection.remove = function (id, key, values, callback) {
        collection.remove(resourceDescription, id, key, values, callback);
    };


    // Give resourceDescription access to other resources
    //resourceDescription.resource = exports;
    if (_.isFunction(resourceDescription.setResources)) {
        resourceDescription.setResources(exports);
    }

    // Add to the list of resources
    return result;
}

exports.helpers = {};
/** Takes care of the details of handling a panel and a dataset.
 *
 * @param newDataset {Object} The dataset object to store in the DB
 * @param panelStream {ReadableStream} A stream representing the panel data
 * @param callback {Function} (err, updatedDataset)
 * @param deepMigrate {Boolean} never set to true. Leave undefined in alsmost all cases.
 */
exports.helpers.createDataset = function createDataset(newDataset, panelStream, callback, deepMigrate) {
    exports.dataset.create(newDataset, function (err, createdDataset) {
        if (err) {
            callback(err);
            return;
        }
        panel.createPanel(createdDataset.id, panelStream, function (err) {
            if (err) {
                callback(err);
                return;
            }
            panel.readPanelJSON(createdDataset.id, {
                properties: {},
                statistics: {}
            }, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }
                // There's a tendency to fail on the update if we're doing alot of updates
                // at the same time, and right after a create. Therefore, we want to retry
                // a few times. In my migration scripts most only needed 1 retry, and a few
                // needed up to 3 retries. None failed permanently. -SRLM
                async.retry(createUpdateRetryCount, function (retryCallback) {
                    var updateTemp = {
                        startTime: result.startTime,
                        endTime: result.endTime,
                        summaryStatistics: result.summaryStatistics,
                        boundingBox: result.boundingBox,
                        boundingCircle: result.boundingCircle,
                        gpsLock: result.gpsLock,
                        source: {
                            scad: result.source
                        }
                    };
                    //console.dir(updateTemp);
                    exports.dataset.update(createdDataset.id, updateTemp,
                        function (err, updatedDataset) {
                            if (err) {
                                server.log(['warning'], 'Error on update: ' + err);
                                setTimeout(function () {
                                    retryCallback(err);
                                }, retryDelay);
                            } else {
                                retryCallback(null, updatedDataset);
                            }
                        });
                }, callback);
            });
        });
    }, deepMigrate);
};



