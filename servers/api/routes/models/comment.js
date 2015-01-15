"use strict";

//var markdown = require('markdown').markdown;
var Joi = require('joi');
var validators = require('../../support/validators');

var expandOptions = ['author'];

var basicModel = {
    id: validators.id,
    startTime: validators.timestamp,
    endTime: validators.timestamp,
    resourceType: Joi.string().valid(['dataset']).description('The resource type that this comment applies to'),
    resourceId: validators.id,
    authorId: validators.id,
    body: Joi.string().description('The body of the comment, in markdown format'),
    createTime: validators.createTime,
    bodyHtml: Joi.string().description('The body of the comment, parsed as markdown and converted to HTML (response only)')
};

var resourceName = 'comment';

module.exports = {
    name: resourceName,

    model: basicModel,
    resultOptions: {
        expand: Joi.array().includes(Joi.string().valid(expandOptions)).description('Expand a resource into the comment. Options are ' + expandOptions.join(', ')),
    },
    resultModel: Joi.object(basicModel).options({className: resourceName}),

    scopes: {
        create: 'trusted',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin'
    },

    operations: {

        create: Joi.object({
            startTime: basicModel.startTime.default(0),
            endTime: basicModel.endTime.default(0),
            resourceType: basicModel.resourceType.required(),
            resourceId: basicModel.resourceId.required(),
            authorId: basicModel.authorId.required(),
            body: basicModel.body.required()
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            startTime: basicModel.startTime,
            endTime: basicModel.endTime,
            resourceType: basicModel.resourceType,
            resourceId: basicModel.resourceId,
            authorId: basicModel.authorId,
            body: basicModel.body
        }).options({className: resourceName + '.update'}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            authorId: basicModel.authorId,
            resourceType: basicModel.resourceType,
            resourceId: basicModel.resourceId
        }
    }
};