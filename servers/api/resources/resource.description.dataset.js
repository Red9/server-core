"use strict";
var _ = require('underscore')._;

var common = require('./resource.common.js');
var validators = require('./validators');
var aggregateStatistics = require('./resource.aggregatestatistics.js');
var async = require('async');

var Joi = require('joi');

var cassandra = require('./cassandra');

var datasetSource = Joi.object().description('the RNC source information').options({className: 'datasetSource'});

// TODO: Add axes here

var tagSingle = Joi.string();
var expandOptions = ['owner', 'event', 'video', 'comment', 'count'];

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
            jsType: 'string',
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
        // TODO(SRLM): Need to check:
        // - owner is valid
        callback(null, dataset);
    },
    setResources: function (resources_) {
        resources = resources_;
    },
    expand: function (parameters, dataset, doneCallback) {
        dataset.duration = dataset.endTime - dataset.startTime;
        if (_.isArray(parameters)) {
            // Assume for now that there is only one expandable:
            // owner
            //console.dir(resources);
            async.each(parameters, function (parameter, callback) {
                if (parameter === 'owner') {
                    resources.user.find({id: dataset.ownerId}, {},
                        function (user) {
                            dataset.owner = user;
                        }, function (err) {
                            if (err) {
                                console.log('Dataset expand: ' + err);
                            }
                            callback(null);
                        });
                } else if (parameter === 'event') {
                    dataset.event = [];
                    resources.event.find({datasetId: dataset.id}, {},
                        function (event) {
                            dataset.event.push(event);
                        }, function (err) {
                            if (err) {
                                console.log('Dataset expand, event: ' + err);
                            }
                            dataset.aggregateStatistics = aggregateStatistics.calculate(dataset.event);
                            callback(null);
                        });

                } else if (parameter === 'video') {
                    dataset.video = [];
                    resources.video.find({datasetId: dataset.id}, {},
                        function (event) {
                            dataset.video.push(event);
                        }, function (err) {
                            if (err) {
                                console.log('Dataset expand, video: ' + err);
                            }
                            callback(null);
                        });

                } else if (parameter === 'comment') {
                    dataset.comment = [];
                    resources.comment.find({resourceId: dataset.id}, {},
                        function (event) {
                            dataset.comment.push(event);
                        }, function (err) {
                            if (err) {
                                console.log('Dataset expand, comment: ' + err);
                            }
                            callback(null);
                        });

                } else if (parameter === 'count') {
                    cassandra.getDatasetCount(dataset.id, function (err, result) {
                        if (err) {
                            console.log(err);
                        } else {
                            dataset.count = result;
                        }
                        callback(null);
                    });
                } else {
                    callback(null);
                }
            }, function (err) {
                doneCallback(null, dataset);
            });
        } else {
            doneCallback(null, dataset);
        }
    }

//        function getRelatedCount(id, callback) {
//            cassandraCustom.getDatasetCount(id, function(count) {
//                callback(count);
//            });
//        }
//        exports.getRelatedCount = getRelatedCount;
//        }
};


//var eventResource = requireFromRoot('support/resources/event');
//var panelResource = requireFromRoot('support/resources/panel');
//var log = requireFromRoot('support/logger').log;
//var deletePre = function (id, continueCallback) {
//    exports.get({id: id}, function (datasets) {
//        if (datasets.length === 1) {
//            // Clean up associated resources
//            var dataset = datasets[0];
//            eventResource.deleteEventByDataset(id, function (errEvent) {
//                panelResource.delete(dataset.headPanelId, function (errPanel) {
//                    if (errEvent || errPanel) {
//                        log.error('Could error deleting associated resources with dataset ' + id + ': ' + errEvent + ', ' + errPanel);
//                        continueCallback(false);
//                    } else {
//                        continueCallback();
//                    }
//                });
//            });
//
//        } else {
//            log.debug('Invalid dataset id ' + id + ': gave ' + datasets.length + ' responses');
//            continueCallback(false);
//        }
//    });
//};

