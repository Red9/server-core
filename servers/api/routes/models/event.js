'use strict';

var Boom = require('boom');
var Joi = require('joi');
var validators = require('../../support/validators');

var expandOptions = ['dataset'];

var eventSource = Joi.object({
    type: Joi.string().valid(['manual', 'auto']).default('auto')
        .description('The type of the entity that made this event'),
    algorithm: Joi.string()
        .description('the name of the algorithm that generated this event'),
    parameters: Joi.object()
        .description('the algorithm specific parameters')
}).description('describes what created this event')
    .options({className: 'eventSource'});

var basicModel = {
    // Auto created keys
    id: validators.id,
    createdAt: validators.createdAt,
    updatedAt: validators.updatedAt,

    // Foreign keys
    datasetId: validators.id,

    startTime: validators.timestamp,
    endTime: validators.timestamp,
    type: Joi.string().description('The event type, free form string'),
    subtype: Joi.string().description('The event sub type, free form string'),
    summaryStatistics: validators.summaryStatistics,
    source: eventSource,
    boundingCircle: Joi.object(),
    boundingBox: Joi.object(),
    gpsLock: Joi.object(),
    ordinalRank: validators.id
        .description('Not used'),
    cardinalRank: Joi.number().integer().min(0).max(5)
        .description('Not used'),

    // Dynamic keys
    duration: validators.duration
};

var resourceName = 'event';

module.exports = {
    name: resourceName,

    model: basicModel,
    resultModel: Joi.object(basicModel).options({className: resourceName}),

    resultOptions: {
        expand: Joi.array().includes(Joi.string().valid(expandOptions)).single()
            .description('Expand a related resource into the dataset')
    },

    metaOptions: {
        aggregateStatistics: Joi.boolean()
            .description('include aggregate statistics on the result set'),
        aggregateStatisticsGroupBy: Joi.string().valid(Object.keys(basicModel))
            .description('Calculate aggregate statistics for each group')
    },

    scopes: {
        create: 'admin',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin'
    },

    operations: {
        create: Joi.object({
            datasetId: basicModel.datasetId.required(),
            startTime: basicModel.startTime.required(),
            endTime: basicModel.endTime.required(),
            type: basicModel.type.required(),
            subtype: basicModel.subtype,
            source: basicModel.source.required()
        }).options({className: resourceName + '.create'}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,

            datasetId: validators.idCSV,
            type: basicModel.type,
            subtype: basicModel.subtype,

            'dataset.userId': Joi.any(),

            startTime: basicModel.startTime,
            'startTime.gt': basicModel.startTime
                .description('Select events whose timestamp is greater than'),
            'startTime.lt': basicModel.startTime
                .description('Select events whose timestamp is less than'),
            endTime: basicModel.endTime,
            'endTime.gt': basicModel.endTime,
            'endTime.lt': basicModel.endTime
        }
    }
};
