"use strict";

var validators = require('../../support/validators');
var Joi = require('joi');

var datasetSource = Joi.object().description('the RNC source information').options({className: 'datasetSource'});

// TODO: Add axes here

var tagSingle = Joi.string();
var expandOptions = ['user', 'event', 'video', 'comment'];

var basicModel = {
    id: validators.id,
    createTime: validators.createTime,
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    duration: validators.duration,
    userId: validators.id,
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

module.exports = {
    name: resourceName,

    model: basicModel,
    resultOptions: {
        expand: Joi.array().includes(Joi.string().valid(expandOptions)).single().description('Expand a resource into the dataset. Options are ' + expandOptions.join(', ')),
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
        update: Joi.object({
            userId: basicModel.userId,
            title: basicModel.title
        }).options({className: resourceName + '.update'}),
        updateCollection: {
            tags: basicModel.tags
        },
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            startTime: basicModel.startTime,
            userId: validators.idCSV,
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
    }
};