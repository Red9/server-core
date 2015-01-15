"use strict";

var Boom = require('boom');
var Joi = require('joi');
var validators = require('../../support/validators');

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
    createTime: validators.createTime,
    ordinalRank: validators.id.description('Link to previous (lower) event. This is a linked list within a single dataset'),
    cardinalRank: Joi.number().integer().min(0).max(5).description('The event cardinal ranking (absolute score). 0 indicates no rank')
};


var resourceName = 'event';

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
    }
};
