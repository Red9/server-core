"use strict";
var Joi = require('joi');
var validators = require('../../support/validators');
var Boom = require('boom');

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
    // Auto created keys
    id: validators.id,
    createdAt: validators.createdAt,
    updatedAt: validators.updatedAt,

    // Core keys
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

module.exports = {
    name: resourceName,

    model: basicModel,
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
        search: {
            id: validators.idCSV,
            idList: validators.idCSV,
            email: basicModel.email,
            displayName: basicModel.displayName,
            scope: validators.multiArray(basicModel.scope)
        }
    }
};