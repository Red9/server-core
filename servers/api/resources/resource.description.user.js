"use strict";

var Joi = require('joi');
var validators = require('./validators');
var nconf = require('nconf');
var _ = require('underscore')._;
var Boom = require('boom');
var async = require('async');

var basicModel = {
    id: validators.id,
    createTime: validators.createTime,
    email: Joi.string().email().description('user email address. Used as "second" primary key for authentication'),
    displayName: Joi.string().description("user's preferred public handle. If set to 'unknown', it will automatically be updated with their Google display name."),
    givenName: Joi.string().description('first name. Set from Google'),
    familyName: Joi.string().description('last name. Set from Google.'),
    preferredLayout: Joi.object().options({className: 'preferredLayout'}).default({}).description('layouts for user'),
    picture: Joi.string().description('link to a profile picture. Set from Google.'),
    gender: Joi.string().valid('male', 'female', 'other').description('gender. Set from Google.'),
    affiliations: Joi.array().includes(Joi.string()).description('organization affiliations of this user'),
    characteristics: Joi.array().includes(Joi.string()).description('user self-defined characteristics')
};

var resourceName = 'user';

var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'user',

    models: {
        model: basicModel,
        create: Joi.object({
            email: basicModel.email.required(),
            displayName: basicModel.displayName,
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
    setResources: function (resources_) {
        resources = resources_;
    },

    checkResource: function (user, doneCallback) {
        // TODO(SRLM): Add some checks here:
        // - layouts exist

        async.series([
                function (callback) { // Make sure that we enforce unique emails
                    var foundUser;
                    resources.user.find({email: user.email}, {},
                        function (foundUser_) {
                            foundUser = foundUser_;
                        },
                        function (err, resultCount) {
                            if (resultCount === 1 && foundUser.id !== user.id) {
                                callback(Boom.badRequest('Email already exists under a different id.'));
                            } else {
                                callback(null);
                            }
                        });
                }
            ],
            function (err) { // done
                doneCallback(err, user);
            }
        );


    },
    expand: function (parameters, user, callback) {
        if (_.isNull(user.picture)) {
            user.picture = nconf.get('defaultUserPicture');
        }
        callback(null, user);
    }
};