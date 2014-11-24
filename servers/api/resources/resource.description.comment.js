"use strict";

var _ = require('underscore')._;
var markdown = require('markdown').markdown;
var Joi = require('joi');
var validators = require('./validators');
var async = require('async');
var Boom = require('boom');

var common = require('./resource.common');

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

var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'comment',

    models: {
        model: basicModel,
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
        resultOptions: {
            expand: Joi.array().includes(Joi.string().valid(expandOptions)).description('Expand a resource into the comment. Options are ' + expandOptions.join(', ')),
        },
        resultModel: Joi.object({
            id: basicModel.id.required(),
            startTime: basicModel.startTime,
            endTime: basicModel.endTime,
            resourceType: basicModel.resourceType.required(),
            resourceId: basicModel.resourceId.required(),
            authorId: basicModel.authorId.required(),
            body: basicModel.body.required(),
            createTime: basicModel.createTime.required(),
            bodyHtml: basicModel.bodyHtml.required()
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            authorId: basicModel.authorId,
            resourceType: basicModel.resourceType,
            resourceId: basicModel.resourceId
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
            cassandraKey: 'resource_type',
            cassandraType: 'varchar',
            jsKey: 'resourceType',
            jsType: 'string'
        },
        {
            cassandraKey: 'resource',
            cassandraType: 'uuid',
            jsKey: 'resourceId',
            jsType: 'string'
        },
        {
            cassandraKey: 'author',
            cassandraType: 'uuid',
            jsKey: 'authorId',
            jsType: 'string',
        },
        {
            cassandraKey: 'body',
            cassandraType: 'varchar',
            jsKey: 'body',
            jsType: 'string'
        },
        {
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'

        }
    ],

    checkResource: function (comment, doneCallback) {
        if (comment.startTime > comment.endTime) {
            doneCallback(Boom.badRequest('if provided, startTime must be less than or equal to endTime'));
            return;
        }

        async.series([
                function (callback) {
                    resources.user.findById(comment.authorId, function (err, user) {
                        if (!user) {
                            callback(Boom.badRequest('user ' + comment.authorId + ' does not exist.'));
                        } else {
                            callback(err);
                        }
                    });
                },
                function (callback) {
                    resources[comment.resourceType].findById(comment.resourceId, function (err, resource) {
                        if (!resource) {
                            callback(Boom.badRequest(comment.resourceType + ' ' + comment.resourceId + ' does not exist.'));
                        } else if (comment.startTime !== 0 && comment.startTime < resource.startTime) {
                            callback(Boom.badRequest('startTime before resource startTime'));
                        } else if (comment.endTime !== 0 && comment.endTime > resource.endTime) {
                            callback(Boom.badRequest('endTime after resource endTime'));
                        } else {
                            callback(err); // Subtle issue here: will this err ever really be set, and can we get here? resource will probably be null, so the early if statement get's caught
                        }
                    });
                }
            ],
            function (err) {
                doneCallback(err, comment);
            });
    },
    setResources: function (resources_) {
        resources = resources_;
    },
    expand: function (parameters, comment, doneCallback) {
        comment.bodyHtml = markdown.toHTML(comment.body);

        if (_.isArray(parameters)) {
            async.each(parameters, function (parameter, callback) {
                // Assume expand is just author.
                resources.user.findById(comment.authorId, function (err, user) {
                    comment.author = user;
                    callback(err);
                });
            }, function (err) {
                doneCallback(err, comment);
            });
        } else {
            doneCallback(null, comment);
        }
    }
};
