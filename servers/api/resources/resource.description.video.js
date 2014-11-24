"use strict";

var Boom = require('boom');
var validators = require('./validators');
var Joi = require('joi');


var basicModel = {
    id: validators.id,
    startTime: validators.timestamp,
    host: Joi.string().valid(['YouTube']).description('The hosting service for this video'),
    hostId: Joi.string().description('The hosting service identifier for this video.'),
    datasetId: validators.id,
    createTime: validators.createTime
};

var resourceName = 'video';
var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'video',

    models: {
        model: basicModel,
        create: Joi.object({
            startTime: basicModel.startTime.required(),
            host: basicModel.host.required(),
            hostId: basicModel.hostId.required(),
            datasetId: basicModel.datasetId.required()
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            startTime: basicModel.startTime,
            host: basicModel.host,
            hostId: basicModel.hostId,
            datasetId: basicModel.datasetId
        }).options({className: resourceName + '.update'}),
        resultModel: Joi.object({
            id: basicModel.id.required(),
            startTime: basicModel.startTime.required(),
            host: basicModel.host.required(),
            hostId: basicModel.hostId.required(),
            datasetId: basicModel.datasetId.required(),
            createTime: basicModel.createTime.required()
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            host: basicModel.host,
            hostId: basicModel.hostId,
            datasetId: basicModel.datasetId
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
            cassandraKey: 'host',
            cassandraType: 'varchar',
            jsKey: 'host',
            jsType: 'string'
        },
        {
            cassandraKey: 'host_id',
            cassandraType: 'varchar',
            jsKey: 'hostId',
            jsType: 'string'
        },
        {
            cassandraKey: 'dataset',
            cassandraType: 'uuid',
            jsKey: 'datasetId',
            jsType: 'string'
        },
        {
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'

        }
    ],
    setResources: function (resources_) {
        resources = resources_;
    },
    checkResource: function (video, callback) {
        // TODO(SRLM): Add checks:
        // - host and hostID are valid (and exist and are public)

        resources.dataset.findById(video.datasetId,
            function (err, dataset) {
                if (dataset) {
                    if (video.startTime > dataset.endTime) {
                        callback(Boom.badRequest('Video startTime after dataset endTime'));
                    } else {
                        callback(null, video);
                    }
                } else {
                    callback(Boom.badRequest('Dataset ' + video.datasetId + ' not found.'));
                }
            });
    },
    expand: function (parameters, video, callback) {
        callback(null, video);
    }
};