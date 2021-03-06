'use strict';

//var markdown = require('markdown').markdown;
var Joi = require('joi');
var validators = require('../../support/validators');

var expandOptions = ['user'];

var basicModel = {
    // Auto created keys
    id: validators.id,
    createdAt: validators.createdAt,
    updatedAt: validators.updatedAt,

    // Foreign keys
    datasetId: validators.id,
    userId: validators.id,

    // Core keys
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    body: Joi.string()
        .description('the body of the comment, in markdown format'),

    // Virtual keys
    bodyHtml: Joi.string()
        .description('comment body parsed as markdown and converted to HTML ')
};

var resourceName = 'comment';

module.exports = {
    name: resourceName,

    model: basicModel,
    resultOptions: {
        expand: Joi.array().items(Joi.string().valid(expandOptions))
            .description('Expand a resource into the comment')
    },
    resultModel: Joi.object(basicModel).meta({className: resourceName}),

    scopes: {
        create: 'trusted',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin'
    },

    operations: {
        create: Joi.object({
            datasetId: basicModel.datasetId.required(),
            userId: basicModel.userId.required(),

            startTime: basicModel.startTime.default(0),
            endTime: basicModel.endTime.default(0),
            body: basicModel.body.required()
        }).meta({className: resourceName + '.create'}),
        update: Joi.object({
            datasetId: basicModel.datasetId,
            userId: basicModel.userId,

            startTime: basicModel.startTime,
            endTime: basicModel.endTime,
            body: basicModel.body
        }).meta({className: resourceName + '.update'}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            userId: basicModel.userId,
            datasetId: basicModel.datasetId
        }
    }
};
