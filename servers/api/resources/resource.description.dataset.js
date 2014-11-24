"use strict";
var _ = require('underscore')._;

var common = require('./resource.common.js');
var validators = require('./validators');
var aggregateStatistics = require('./resource.aggregatestatistics.js');
var async = require('async');
var Boom = require('boom');

var Joi = require('joi');

var cassandra = require('./cassandra');

var datasetSource = Joi.object().description('the RNC source information').options({className: 'datasetSource'});

// TODO: Add axes here

var tagSingle = Joi.string();
var expandOptions = ['owner', 'event', 'video', 'comment', 'count'];

var deleteEachLimit = 5;

var basicModel = {
    id: validators.id,
    createTime: validators.createTime,
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    duration: validators.duration,
    ownerId: validators.id,
    title: Joi.string().description('the human readable title of this dataset'),
    summaryStatistics: validators.summaryStatistics,
    timezone: Joi.string().description('timezone information. Not used at this time.'),
    source: datasetSource,
    boundingCircle: Joi.object(),
    boundingBox: Joi.object(),
    gpsLock: Joi.object(),
    tags: Joi.array().includes(tagSingle)
};

var resourceName = 'dataset';

var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'dataset',

    models: {
        model: basicModel,
        create: Joi.object({ /// Important: be sure to change the model in the dataset route as well.
            ownerId: basicModel.ownerId.required(),
            title: basicModel.title.required()
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            ownerId: basicModel.ownerId,
            title: basicModel.title
        }).options({className: resourceName + '.update'}),
        updateCollection: {
            tags: basicModel.tags
        },
        resultOptions: {
            expand: Joi.array().includes(Joi.string().valid(expandOptions)).description('Expand a resource into the dataset. Options are ' + expandOptions.join(', ')),
        },
        resultModel: Joi.object({
            id: basicModel.id.required(),
            ownerId: basicModel.ownerId.required(),
            title: basicModel.title.required(),
            createTime: basicModel.createTime.required(),
            duration: basicModel.duration.required(),
            summaryStatistics: basicModel.summaryStatistics.required(),
            source: basicModel.source.required(),
            startTime: basicModel.startTime.required(),
            endTime: basicModel.endTime.required(),
            gpsLock: basicModel.gpsLock.required(),
            tags: basicModel.tags.required(),

            boundingCircle: basicModel.boundingCircle,
            boundingBox: basicModel.boundingBox,


            // These are part of the migration away from Cassandra panels, so they're not required yet
            timezone: basicModel.timezone
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            startTime: basicModel.startTime,
            ownerId: validators.idCSV,
            title: basicModel.title,
            tags: validators.multiArray(tagSingle),
            'startTime.gt': basicModel.startTime.description('Select datasets that begin after a given time'),
            'startTime.lt': basicModel.startTime.description('Select datasets that begin before a given time'),
            endTime: basicModel.endTime,
            'endTime.gt': basicModel.endTime.description('Select datasets that end after a given time'),
            'endTime.lt': basicModel.endTime.description('Select datasets that end before a given time'),
            createTime: basicModel.createTime,
            'createTime.gt': basicModel.createTime.description('Select datasets that were created after a given time'),
            'createTime.lt': basicModel.createTime.description('Select datasets that were created before a given time')
        }
    },

    mapping: [
        {
            cassandraKey: 'id',
            cassandraType: 'uuid',
            jsKey: 'id',
            jsType: 'string'
        },
        {
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'

        },
        {
            cassandraKey: 'start_time',
            cassandraType: 'timestamp',
            jsKey: 'startTime',
            jsType: 'timestamp'
        },
        {
            cassandraKey: 'end_time',
            cassandraType: 'timestamp',
            jsKey: 'endTime',
            jsType: 'timestamp'
        },
        {
            cassandraKey: 'name',
            cassandraType: 'varchar',
            jsKey: 'title',
            jsType: 'string'
        },
        {
            cassandraKey: 'owner',
            cassandraType: 'uuid',
            jsKey: 'ownerId',
            jsType: 'string'
        },
        {
            cassandraKey: 'source',
            cassandraType: 'varchar',
            jsKey: 'source',
            jsType: 'object'
        },
        {
            cassandraKey: 'summary_statistics',
            cassandraType: 'varchar',
            jsKey: 'summaryStatistics',
            jsType: 'object'
        },
        {
            cassandraKey: 'bounding_circle',
            cassandraType: 'map<text, double>',
            jsKey: 'boundingCircle',
            jsType: 'object'
        },
        {
            cassandraKey: 'bounding_box',
            cassandraType: 'map<text, double>',
            jsKey: 'boundingBox',
            jsType: 'object'
        },
        {
            cassandraKey: 'gps_lock',
            cassandraType: 'map<text, int>',
            jsKey: 'gpsLock',
            jsType: 'object'
        },
        {
            cassandraKey: 'tags',
            cassandraType: 'set<text>',
            jsKey: 'tags',
            jsType: 'array'
        }
    ],
    checkResource: function (dataset, callback) {
        resources.user.findById(dataset.ownerId, function (err, user) {
            if (!user) {
                callback(Boom.badRequest('Owner does not exist'));
            } else {
                callback(err, dataset);
            }
        });
    },
    setResources: function (resources_) {
        resources = resources_;
    },
    expand: function (parameters, dataset, doneCallback) {
        dataset.duration = dataset.endTime - dataset.startTime;
        if (!_.isArray(parameters)) {
            parameters = [];
        }

        async.each(parameters, function (parameter, callback) {
            if (parameter === 'owner') {
                resources.user.find({id: dataset.ownerId}, {},
                    function (user) {
                        dataset.owner = user;
                    }, callback);
            } else if (parameter === 'event') {
                dataset.event = [];
                resources.event.find({datasetId: dataset.id}, {},
                    function (event) {
                        dataset.event.push(event);
                    }, function (err) {
                        dataset.aggregateStatistics = aggregateStatistics.calculate(dataset.event);
                        callback(err);
                    });

            } else if (parameter === 'video') {
                dataset.video = [];
                resources.video.find({datasetId: dataset.id}, {},
                    function (event) {
                        dataset.video.push(event);
                    }, callback);

            } else if (parameter === 'comment') {
                dataset.comment = [];
                resources.comment.find({resourceId: dataset.id}, {},
                    function (event) {
                        dataset.comment.push(event);
                    }, callback);

            } else { // parameter === 'count' // Default. Should never be anything but count, but just in case.
                cassandra.getDatasetCount(dataset.id, function (err, result) {
                    dataset.count = result;
                    callback(err);
                });
            }
        }, function (err) {
            doneCallback(err, dataset);
        });
    },
    remove: function (id, doneCallback) {

        /**
         *
         * @param resource {Object}
         * @param idList {Array} A list of IDs to delete
         * @param callback {Function} (err)
         */
        function deleteList(resource, idList, callback) {
            async.eachLimit(idList, deleteEachLimit,
                function (id, cb) {
                    resource.delete(id, cb);
                },
                callback);
        }

        /**
         *
         * @param resource {Object}
         * @param datasetId {string}
         * @param datasetIdKey {string}
         * @returns {Function} (callback)
         */
        function deleteAllByType(resource, datasetId, datasetIdKey) {
            return function (callback) {
                var idList = [];
                var query = {};
                query[datasetIdKey] = datasetId;
                resource.find(query, {},
                    function (r) {
                        idList.push(r.id);
                    },
                    function (err) {
                        if (err) { // How can I get code coverage of this if?
                            callback(err);
                        } else {
                            deleteList(resource, idList, callback);
                        }
                    });
            };
        }

        async.parallel([
            deleteAllByType(resources.event, id, 'datasetId'),
            deleteAllByType(resources.video, id, 'datasetId'),
            deleteAllByType(resources.comment, id, 'resourceId'),
            function (callback) {
                resources.panel.deletePanel(id, callback);
            }
        ], function (err) {
            doneCallback(err);
        });
    }
};

