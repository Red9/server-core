"use strict";


/** Master file to provide access to resources
 *
 *
 */
var _ = require('underscore')._;
var Boom = require('boom');
var async = require('async');

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
panel.resources = exports;

var createUpdateRetryCount = 25;
var retryDelay = 250;

/**
 *
 * @param config {object} With the following keys:
 * - cassandraHosts {array of IP/URL:PORTs},
 * - cassandraKeyspace {string}
 * @param callback {function} (err)
 *
 */
exports.init = function (config, callback) {
    require('./cassandra').init(config, callback);
};

/**
 *
 * @param resourceDescription
 * @returns {{}}
 */
function addResource(resourceDescription) {
    var result = {};

    result.name = resourceDescription.name;
    result.models = resourceDescription.models;

    /**
     *
     * Assumes all input is valid.
     *
     * @param newResource {object} resource to create
     * @param callback {function} (err, createdResource)
     * @param [deepMigrate] {bool} Ignore almost always. Set to true to prevent some defaults from being created.
     */
    result.create = function (newResource, callback, deepMigrate) {
        crud.create(resourceDescription, newResource, callback, deepMigrate);
    };

    /**
     *
     * @param query {object}
     * @param [options] {object}
     * @param [rowCallback] {function} (resource)
     * @param doneCallback {function} (err, rowCount)
     */
    result.find = function (query, options, rowCallback, doneCallback) {
        crud.find(resourceDescription, query, options, rowCallback, doneCallback);
    };

    /**
     *
     * @param id {string}
     * @param resourceUpdate {object}
     * @param callback {function} (err, updatedResource)
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

    /** DELETE from database
     *
     * No error if resource doesn't exist.
     *
     * @param id
     * @param callback {function} (err)
     */
    result.delete = function (id, callback) {
        crud.delete(resourceDescription, id, callback);
    };

    result.collection = {
        add: function (id, key, values, callback) {
            collection.add(resourceDescription, id, key, values, callback);
        },

        remove: function (id, key, values, callback) {
            collection.remove(resourceDescription, id, key, values, callback);
        }
    };

    // Give resourceDescription access to other resources
    //resourceDescription.resource = exports;
    if (_.isFunction(resourceDescription.setResources)) {
        resourceDescription.setResources(exports);
    }

    // Add to the list of resources
    return result;
}


exports[eventDescription.name] = addResource(eventDescription);
exports[userDescription.name] = addResource(userDescription);
exports[commentDescription.name] = addResource(commentDescription);
exports[videoDescription.name] = addResource(videoDescription);
exports[layoutDescription.name] = addResource(layoutDescription);
exports[datasetDescription.name] = addResource(datasetDescription);

exports.helpers = {
    /** Takes care of the details of handling a panel and a dataset.
     *
     * @param newDataset The dataset object to store in the DB
     * @param panelStream A stream representing the panel data
     * @param callback {err, updatedDataset}
     * @param bool never set to true. Leave undefined.
     */
    createDataset: function createDataset(newDataset, panelStream, callback, deepMigrate) {
        exports.dataset.create(newDataset, function (err, createdDataset) {
            if (err) {
                console.log(err);
            }
            panel.createPanel(createdDataset.id, panelStream, function (err) {
                if (err) {
                    console.log(err);
                    callback(err);
                } else {
                    setTimeout(function () {
                        panel.readPanelJSON(createdDataset.id, {
                            properties: {},
                            statistics: {}
                        }, function (err, result) {
                            if (err) {
                                console.log(err);
                                callback(err);
                            } else {
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
                                                console.log('Error on update: ' + err);
                                                setTimeout(function () {
                                                    retryCallback(err);
                                                }, retryDelay);
                                            } else {
                                                retryCallback(null, updatedDataset);
                                            }
                                        });
                                }, callback);
                            }
                        });
                    }, 500);
                }
            });
        }, deepMigrate);
    }
};



