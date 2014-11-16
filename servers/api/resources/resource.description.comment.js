"use strict";

var _ = require('underscore')._;
var markdown = require('markdown').markdown;
var Joi = require('joi');
var validators = require('./validators');
var async = require('async');

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

    checkResource: function (comment, callback) {
        /* TODO(CHECK):
         startTime <= endTime
         author invalid
         body is empty
         resourceType is invalid
         resource does not exist
         if startTime and endTime are defined then must be valid for dataset
         */
        callback(null, comment);
    },
    setResources: function (resources_) {
        resources = resources_;
    },
    expand: function (parameters, comment, doneCallback) {
        comment.bodyHtml = markdown.toHTML(comment.body);

        if (_.isArray(parameters)) {
            async.each(parameters, function (parameter, callback) {
                if (parameter === 'author') {
                    resources.user.find({id: comment.authorId}, {},
                        function (user) {
                            comment.author = user;
                        }, function (err) {
                            if (err) {
                                console.log('Author expand: ' + err);
                            }
                            callback(null);
                        });
                } else {
                    callback(null);
                }
            }, function (err) {
                doneCallback(null, comment);
            });
        } else {
            doneCallback(null, comment);
        }
    }
};
