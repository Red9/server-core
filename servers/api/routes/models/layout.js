"use strict";

var Joi = require('joi');
var validators = require('../../support/validators');

var basicModel = {
    // Auto cretaed keys
    id: validators.id,
    createdAt: validators.createdAt,
    updatedAt: validators.updatedAt,

    // Core keys
    title: Joi.string().description('A short title for this layout'),
    description: Joi.string().description('Human readable description of this layout'),
    for: Joi.array().includes(Joi.string()).description('Routes that this layout is applicable for'),
    layout: Joi.any().description('The actual layout description')
};

var resourceName = 'layout';

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
            title: basicModel.title.required(),
            description: basicModel.description.required(),
            for: basicModel.for.required(),
            layout: basicModel.layout.required()
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            title: basicModel.title,
            description: basicModel.description,
            for: basicModel.for,
            layout: basicModel.layout
        }).options({className: resourceName + '.update'}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV
        }
    }
};