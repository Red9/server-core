'use strict';

var validators = require('../../support/validators');
var Joi = require('joi');

var datasetSource = Joi.object().description('the RNC source information')
    .options({className: 'datasetSource'});

// TODO: Add axes here

var tagSingle = Joi.string();
var expandOptions = ['user', 'event', 'video', 'comment'];

var sportList = require('../extra/sport').sportList;

var basicModel = {
    // Auto created keys
    id: validators.id,
    createdAt: validators.createdAt,
    updatedAt: validators.updatedAt,

    // Foreign keys
    userId: validators.id,

    // Core keys
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    title: Joi.string()
        .description('Comparisons are case insensitive with bookend wildcards')
        .meta({textSearch: true}),
    summaryStatistics: validators.summaryStatistics,
    timezone: Joi.string()
        .description('timezone information. Not used at this time'),
    source: datasetSource,
    boundingCircle: Joi.object(),
    boundingBox: Joi.object(),
    gpsLock: Joi.object(),
    tags: Joi.array().includes(tagSingle)
        .description('flexible tags to segment datasets into groups'),
    sport: Joi.string().valid(sportList).description('the sport category'),

    // Dynamic keys
    duration: validators.duration
};

var resourceName = 'dataset';

module.exports = {
    name: resourceName,

    model: basicModel,
    resultOptions: {
        expand: Joi.array().includes(Joi.string().valid(expandOptions))
            .single().description('Expand a resource into the dataset')
    },
    metaOptions: {
        aggregateStatistics: Joi.boolean()
            .description('include aggregate statistics on the result set'),
        aggregateStatisticsGroupBy: Joi.string().valid(Object.keys(basicModel))
            .description('calculate aggregate statistics for each group')
    },
    resultModel: Joi.object(basicModel).options({className: resourceName}),

    scopes: {
        create: 'admin',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin',
        collection: {
            update: 'admin',
            remove: 'admin'
        }
    },

    operations: {
        // No create, since that's a special case
        update: Joi.object({
            userId: basicModel.userId,
            title: basicModel.title,
            sport: basicModel.sport
        }).options({className: resourceName + '.update'}),
        updateCollection: {
            tags: basicModel.tags
        },
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,

            userId: validators.idCSV,
            title: basicModel.title,
            tags: basicModel.tags,
            sport: basicModel.sport,

            startTime: basicModel.startTime,
            'startTime.gt': basicModel.startTime
                .description('Select datasets that begin after a given time'),
            'startTime.lt': basicModel.startTime
                .description('Select datasets that begin before a given time'),
            endTime: basicModel.endTime,
            'endTime.gt': basicModel.endTime
                .description('Select datasets that end after a given time'),
            'endTime.lt': basicModel.endTime
                .description('Select datasets that end before a given time'),

            createdAt: basicModel.createdAt,
            'createdAt.gt': basicModel.createdAt
                .description('Select datasets that were created after time t'),
            'createdAt.lt': basicModel.createdAt
                .description('Select datasets that were created before time t')
        }
    }
};
