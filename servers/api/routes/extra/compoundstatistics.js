'use strict';

var _ = require('lodash');
var Boom = require('boom');
var Joi = require('joi');

var validators = require('../../support/validators');
var datasetRoute = require('../models/dataset');
var utilities = require('../utilities');

var datasetGroupBy = require('../../support/datasetgroupby');
var aggregateStatistics = require('../../support/aggregatestatistics');

function calculateStatistics(datasetList) {

    var totalDuration =
        _.chain(datasetList).pluck('duration').reduce(function (total, d) {
            return total + d;
        }, 0).value();

    var eventList
        = _.chain(datasetList).pluck('events').flatten().value();

    return {
        datasets: aggregateStatistics(datasetList),
        events: aggregateStatistics(eventList, {
            groupEvents: true,
            parentDuration: totalDuration
        })
    };
}

function evaluateNested(data) {
    if (!_.isArray(data)) {
        console.log('mapValues');
        return _.mapValues(data, evaluateNested);
    } else {
        console.log('calculateStatistics');
        return calculateStatistics(data);
    }
}

exports.init = function (server, models) {
    server.route({
        method: 'GET',
        path: '/compound/',
        config: {
            handler: function (request, reply) {

                models.dataset
                    .findAll({
                        include: models.event,
                        where: utilities.pickSearch(request.query,
                            datasetRoute.operations.search)
                    })
                    .then(function (datasetList) {
                        var t = datasetList;

                        if (request.query.groupBy) {
                            console.log('groupBy: ' + request.query.groupBy);
                            t = datasetGroupBy(datasetList,
                                request.query.groupBy.split(','));
                        }

                        utilities.replyMetadata(request, reply,
                            evaluateNested(t));
                    })
                    .catch(function (err) {
                        console.log(err);
                        console.log(err.stack);
                        reply(Boom.badRequest(err));
                    });
            },
            validate: {
                query: _.extend({},
                    datasetRoute.operations.search,
                    {
                        metaformat: validators.metaformat,
                        groupBy: Joi.string()
                            .description('CSV list of keys to group nest by')
                    }
                )
            },
            description: 'Compound statistics',
            notes: 'Dynamically calculate compound statistics. Compound ' +
            'statistics are aggregate statistics for a set of datasets and ' +
            'aggregate statistics for the events covered by those datasets',
            tags: ['api'],
            auth: {
                scope: 'basic'
            }
        }
    });
};
