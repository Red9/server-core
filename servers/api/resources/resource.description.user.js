"use strict";

var Joi = require('joi');
var validators = require('./validators');
var nconf = require('nconf');
var _ = require('underscore')._;

var basicModel = {
    id: validators.id,
    createTime: validators.createTime,
    email: Joi.string().email().description('user email address. Used as "second" primary key for authentication'),
    displayName: Joi.string().description("user's preferred public handle"),
    givenName: Joi.string().description('first name'),
    familyName: Joi.string().description('last name'),
    preferredLayout: Joi.object().options({className: 'preferredLayout'}).default({}).description('layouts for user'),
    picture: Joi.string().description('link to a profile picture.'),
    gender: Joi.string().valid('male', 'female', 'other').description('gender'),
    affiliations: Joi.array().includes(Joi.string()).description('organization affiliations of this user'),
    characteristics: Joi.array().includes(Joi.string()).description('user self-defined characteristics')
};

var resourceName = 'user';


module.exports = {
    name: resourceName,
    tableName: 'user',

    models: {
        model: basicModel,
        create: Joi.object({
            email: basicModel.email.required(),
            displayName: basicModel.displayName.required(),
            preferredLayout: basicModel.preferredLayout,
            affiliations: basicModel.affiliations,
            characteristics: basicModel.characteristics
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            //email: basicModel.email, // Can't update email, since that's a "primary key"
            displayName: basicModel.displayName,
            preferredLayout: basicModel.preferredLayout,
            affiliations: basicModel.affiliations,
            characteristics: basicModel.characteristics
        }).options({className: resourceName + '.update'}),
        resultModel: Joi.object({
            id: basicModel.id.required(),
            email: basicModel.email.required(),
            displayName: basicModel.displayName.required(),
            givenName: basicModel.givenName.required(),
            familyName: basicModel.familyName.required(),
            preferredLayout: basicModel.preferredLayout,
            picture: basicModel.picture.required(),
            gender: basicModel.gender.required(),
            createTime: basicModel.createTime.required(),
            affiliations: basicModel.affiliations.required(),
            characteristics: basicModel.characteristics.required()
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            email: basicModel.email,
            displayName: basicModel.displayName
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
            cassandraKey: 'display_name',
            cassandraType: 'varchar',
            jsKey: 'displayName',
            jsType: 'string'
        },
        {
            cassandraKey: 'first',
            cassandraType: 'varchar',
            jsKey: 'givenName',
            jsType: 'string'
        },
        {
            cassandraKey: 'last',
            cassandraType: 'varchar',
            jsKey: 'familyName',
            jsType: 'string'
        },
        {
            cassandraKey: 'preferred_layout',
            cassandraType: 'map<text,text>',
            jsKey: 'preferredLayout',
            jsType: 'object'
        },
        {
            cassandraKey: 'email',
            cassandraType: 'varchar',
            jsKey: 'email',
            jsType: 'string'
        },
        {
            cassandraKey: 'picture',
            cassandraType: 'varchar',
            jsKey: 'picture',
            jsType: 'string'
        },
        {
            cassandraKey: 'gender',
            cassandraType: 'varchar',
            jsKey: 'gender',
            jsType: 'string'
        },
        {
            cassandraKey: 'create_time',
            cassandraType: 'timestamp',
            jsKey: 'createTime',
            jsType: 'timestamp'
        },
        {
            cassandraKey: 'affiliations',
            cassandraType: 'set<text>',
            jsKey: 'affiliations',
            jsType: 'array'
        },
        {
            cassandraKey: 'characteristics',
            cassandraType: 'set<text>',
            jsKey: 'characteristics',
            jsType: 'array'
        }
    ],

    checkResource: function (user, callback) {
        // TODO(SRLM): Add some checks here:
        // - email does not exist

        callback(null, user);
    },
    expand: function (parameters, user, callback) {
        if (_.isNull(user.picture)) {
            console.log('Cookie domain: ' + nconf.get('authorizationCookieDomain'));
            user.picture = nconf.get('defaultUserPicture');
        }
        callback(null, user);
    }
};