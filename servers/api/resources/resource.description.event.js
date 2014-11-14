"use strict";

var Boom = require('boom');
var Joi = require('joi');
var validators = require('./validators');

var eventSource = Joi.object({
    type: Joi.string().valid(['manual', 'auto']).default('auto').description('The type of the entity that made this event'),
    createTime: validators.timestamp, // This is required on result, but not on input.
    algorithm: Joi.string().description('the name of the algorithm that generated this event, if applicable'),
    parameters: Joi.object().description('the algorithm specific parameters')
}).description('describes what created this event').options({className: 'eventSource'});


var basicModel = {
    id: validators.id,
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    duration: validators.duration,
    datasetId: validators.id,
    type: Joi.string().description('The event type, free form string'),
    subtype: Joi.string().description('The event sub type, free form string'),
    summaryStatistics: validators.summaryStatistics,
    source: eventSource,
    boundingCircle: Joi.object(),
    boundingBox: Joi.object(),
    gpsLock: Joi.object(),
    createTime: validators.createTime
};


var resourceName = 'event';
var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'event',

    models: {
        model: basicModel,
        create: Joi.object({
            startTime: basicModel.startTime.required(),
            endTime: basicModel.endTime.required(),
            type: basicModel.type.required(),
            subtype: basicModel.subtype,
            datasetId: basicModel.datasetId.required(),
            source: basicModel.source.required()
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            startTime: basicModel.startTime,
            endTime: basicModel.endTime,
            type: basicModel.type,
            subtype: basicModel.subtype,
            datasetId: basicModel.datasetId,
            source: basicModel.source
        }).options({className: resourceName + '.update'}),
        resultModel: Joi.object({
            id: basicModel.id.required(),
            startTime: basicModel.startTime.required(),
            endTime: basicModel.endTime.required(),
            duration: basicModel.duration.required(),
            type: basicModel.type.required(),
            subtype: basicModel.subtype,
            datasetId: basicModel.datasetId.required(),
            source: basicModel.source.required(),
            summaryStatistics: basicModel.summaryStatistics.required(),
            boundingCircle: basicModel.boundingCircle,
            boundingBox: basicModel.boundingBox,
            gpsLock: basicModel.gpsLock,
            createTime: basicModel.createTime.required()
        }).options({className: resourceName}),
        search: {
            'id': validators.idCSV,
            'idList': validators.idCSV,
            'startTime': basicModel.startTime,
            'startTime.gt': basicModel.startTime.description('Select events whose timestamp is greater than'),
            'startTime.lt': basicModel.startTime.description('Select events whose timestamp is less than'),
            'endTime': basicModel.endTime,
            'endTime.gt': basicModel.endTime,
            'endTime.lt': basicModel.endTime,
            'datasetId': validators.idCSV,
            'type': basicModel.type,
            'subtype': basicModel.subtype
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
            cassandraKey: 'type',
            cassandraType: 'varchar',
            jsKey: 'type',
            jsType: 'string'
        },
        {
            cassandraKey: 'subtype',
            cassandraType: 'varchar',
            jsKey: 'subtype',
            jsType: 'string'
        },
        {
            cassandraKey: 'dataset',
            cassandraType: 'uuid',
            jsKey: 'datasetId',
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
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'

        }
    ],

    checkResource: function (event, callback) {


        if (event.startTime >= event.endTime) {
            callback(Boom.conflict('event startTime ' + event.startTime + ' is greater than or equal to event endTime ' + event.endTime));
            return;
        }

        var dataset;
        resources.dataset.find({id: event.datasetId}, {},
            function (dataset_) {
                dataset = dataset_;
            },
            function (err) {
                if (dataset) {
                    if (event.startTime < dataset.startTime || event.startTime > dataset.endTime) {
                        callback(Boom.conflict('Event startTime not in dataset range: ' + dataset.startTime + ' < ' + event.startTime + ' < ' + dataset.endTime));
                    } else if (event.endTime < dataset.startTime || event.endTime > dataset.endTime) {
                        callback(Boom.conflict('Event endTime not in dataset range: ' + dataset.startTime + ' < ' + event.endTime + ' < ' + dataset.endTime));
                    } else {
                        resources.panel.readPanelJSON(event.datasetId, {
                            statistics: {},
                            properties: {},
                            startTime: event.startTime,
                            endTime: event.endTime,
                            csPeriod: 10000
                        }, function (err, panelResult) {
                            if (err) {
                                console.log('Event.checkResource error: ' + err);
                            }
                            event.summaryStatistics = panelResult.summaryStatistics;
                            event.boundingBox = panelResult.boundingBox;
                            event.boundingCircle = panelResult.boundingCircle;
                            event.gpsLock = panelResult.gpsLock;
                            callback(null, event);
                        });
                    }
                } else {
                    callback(Boom.conflict('Dataset ' + event.datasetId + ' not found.'));
                }

            });
        /*
         // TODO(SRLM): This code is waiting until the dataset resource is completed.
         var dataset;
         resource.dataset.find({id: event.datasetId}, null,
         function (foundDataset) {
         // Store it here so that we don't have to worry about calling callback multiple times
         dataset = foundDataset;
         },
         function (err, rowCount) {
         if (err) {
         callback(err);
         }else if(rowCount !== 1){
         callback(new VError('No dataset match (%s)', rowCount);
         } else if (event.startTime < dataset.startTime) {
         callback(new VError('Event startTime %s is less than dataset start time %s', event.startTime, event.endTime));
         } else if (event.endTime > dataset.endTime) {
         callback(new VError('Event endTime %s is more than dataset end time %s', event.endTime, dataset.endTime));
         } else {
         callback(null);
         }
         });
         */
    },
    setResources: function (resources_) {
        resources = resources_;
    },

    expand: function (parameters, event, callback) {
        event.duration = event.endTime - event.startTime;
        callback(null, event);
    }
};

// Testing exports
//exports.checkSource = checkSource;