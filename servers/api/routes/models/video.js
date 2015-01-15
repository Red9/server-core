"use strict";

var validators = require('../../support/validators');
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

module.exports = {
    name: resourceName,

    model: basicModel,
    resultModel: Joi.object(basicModel).options({className: resourceName}),

    scopes: {
        create: 'admin',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin'
    },

    operations: {
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
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            host: basicModel.host,
            hostId: basicModel.hostId,
            datasetId: basicModel.datasetId
        }
    }
};