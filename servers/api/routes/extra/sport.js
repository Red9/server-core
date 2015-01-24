'use strict';

var _ = require('lodash');

var sports = [
    {
        name: 'none'
    },
    {
        name: 'surf'
    },
    {
        name: 'bike'
    },
    {
        name: 'skateboard'
    },
    {
        name: 'snowboard'
    },
    {
        name: 'ski'
    },
    {
        name: 'motorcycle'
    },
    {
        name: 'run'
    },
    {
        name: 'paddleboard'
    }
];

exports.init = function (server) {
    server.route({
        method: 'GET',
        path: '/sport/',
        config: {
            handler: function (request, reply) {
                reply(sports);
            },
            description: 'Available sports',
            notes: 'Available sports.',
            tags: ['api'],
            auth: {
                scope: 'basic'
            }
        }
    });
};

exports.sportList = _.pluck(sports, 'name');
