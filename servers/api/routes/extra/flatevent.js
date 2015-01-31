'use strict';

var _ = require('lodash-contrib');
//var _ = require('lodash');

var Boom = require('boom');
var Joi = require('joi');

var validators = require('../../support/validators');
var datasetRoute = require('../models/dataset');
var utilities = require('../utilities');

var fields = [
    'type',
    'subtype',
    'id',
    'startTime',
    'duration',
    'datasetId',
    'dataset.userId',
    'dataset.user.displayName',
    'summaryStatistics.distance.path',
    'summaryStatistics.gps.speed.maximum',
    'summaryStatistics.gps.speed.average'
];

function selectFields(event) {
    return _.reduce(fields, function (memo, field) {
        memo[field] = _.getPath(event, field);
        return memo;
    }, {});
}

exports.init = function (server, models) {

    server.route({
        method: 'GET',
        path: '/flatevent/',
        handler: function (request, reply) {
            models.event
                .findAll({
                    where: {
                        type: ['Wave'],
                        'dataset.userId': [2, 4, 17],
                        'dataset.sport': 'surf'
                    },
                    include: [{
                        model: models.dataset, include: [models.user]
                        /*, attributes: []*/
                    }]//,
                    //attributes: fields
                })
                .then(function (eventList) {
                    //reply(eventList);
                    reply(_.map(eventList, selectFields));
                })
                .catch(function (err) {
                    reply(err);
                });
        },
        config: {
            validate: {
                query: {
                    fields: validators.fields
                }
            }
        }
    });
};
