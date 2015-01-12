"use strict";

var Joi = require('joi');
var validators = require('./validators');
var nconf = require('nconf');
var _ = require('underscore')._;
var Boom = require('boom');
var async = require('async');

var stateList = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];

var sport = {
    surf: Joi.object().keys({
        stance: Joi.string().valid('regular', 'goofy', 'switch').description('Stance on the board'),
        startDate: validators.timestamp,
        localBreak: Joi.string().description('free form string'),
        favoriteShop: Joi.string().description('free form string'),
        favoriteBoard: Joi.string().description('free form string')
    })
};


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
    height: Joi.number().min(1).max(3).description('user height in meters.'),
    weight: Joi.number().min(20).max(180).description('user weight in kilograms.'),
    tagline: Joi.string().description('A short descriptive quip for the user.'),
    city: Joi.string().description("The user's home city."),
    state: Joi.string().valid(stateList).description('User home state.'),
    sport: Joi.object().keys(sport).description('Information about the sports a user participates in'),
    scope: validators.scope
};

var resourceName = 'user';

var resources; // Dynamically filled with links to the other resources.

module.exports = {
    name: resourceName,
    tableName: 'user',

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

    models: {
        model: basicModel,
        create: Joi.object({
            email: basicModel.email.required(),
            displayName: basicModel.displayName,
            preferredLayout: basicModel.preferredLayout,
            height: basicModel.height,
            weight: basicModel.weight,
            tagline: basicModel.tagline,
            city: basicModel.city,
            state: basicModel.state,
            sport: basicModel.sport,
            scope: basicModel.scope
        }).options({className: resourceName + '.create'}),
        update: Joi.object({
            //email: basicModel.email, // Can't update email, since that's a "primary key"
            displayName: basicModel.displayName,
            preferredLayout: basicModel.preferredLayout,
            height: basicModel.height,
            weight: basicModel.weight,
            tagline: basicModel.tagline,
            city: basicModel.city,
            state: basicModel.state,
            sport: basicModel.sport,
            scope: basicModel.scope
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
            height: basicModel.height,
            weight: basicModel.weight,
            tagline: basicModel.tagline,
            city: basicModel.city,
            state: basicModel.state,
            sport: basicModel.sport,
            scope: basicModel.scope.required()
        }).options({className: resourceName}),
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            email: basicModel.email,
            displayName: basicModel.displayName,
            scope: validators.multiArray(basicModel.scope)
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
            cassandraKey: 'weight',
            cassandraType: 'float',
            jsKey: 'weight',
            jsType: 'number'
        },
        {
            cassandraKey: 'height',
            cassandraType: 'float',
            jsKey: 'height',
            jsType: 'number'
        },
        {
            cassandraKey: 'tagline',
            cassandraType: 'varchar',
            jsKey: 'tagline',
            jsType: 'string'
        },
        {
            cassandraKey: 'city',
            cassandraType: 'varchar',
            jsKey: 'city',
            jsType: 'string'
        },
        {
            cassandraKey: 'state',
            cassandraType: 'varchar',
            jsKey: 'state',
            jsType: 'string'
        },
        {
            cassandraKey: 'sport',
            cassandraType: 'varchar',
            jsKey: 'sport',
            jsType: 'object'
        },
        {
            cassandraKey: 'scope',
            cassandraType: 'set<text>',
            jsKey: 'scope',
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