"use strict";

var Joi = require('joi');
var validators = require('./validators');

var basicModel = {
    id: validators.id,
    createTime: validators.createTime,
    title: Joi.string().description('A short title for this layout'),
    description: Joi.string().description('Human readable description of this layout'),
    for: Joi.array().includes(Joi.string()).description('Routes that this layout is applicable for'),
    layout: Joi.any().description('The actual layout description')
};

var resourceName = 'layout';


module.exports = {
    name: resourceName,
    tableName: 'layout',

    scopes: {
        create: 'admin',
        read: 'basic',
        search: 'basic',
        update: 'admin',
        remove: 'admin'
    },

    models: {
        model: basicModel,
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
        resultModel: Joi.object({
            id: basicModel.id.required(),
            title: basicModel.title.required(),
            description: basicModel.description.required(),
            for: basicModel.for.required(),
            layout: basicModel.layout.required(),
            createTime: basicModel.createTime.required()
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV
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
            cassandraKey: 'title',
            cassandraType: 'varchar',
            jsKey: 'title',
            jsType: 'string'
        },
        {
            cassandraKey: 'description',
            cassandraType: 'varchar',
            jsKey: 'description',
            jsType: 'string'
        },
        {
            cassandraKey: 'for',
            cassandraType: 'varchar',
            jsKey: 'for',
            jsType: 'object'
        },
        {
            cassandraKey: 'layout',
            cassandraType: 'varchar',
            jsKey: 'layout',
            jsType: 'object'
        },
        {
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'

        }
    ],

    checkResource: function (layout, callback) {
        callback(null, layout);
    },
    expand: function (parameters, layout, callback) {
        callback(null, layout);
    }
};

