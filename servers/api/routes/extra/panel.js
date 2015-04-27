'use strict';

var Joi = require('joi');
var _ = require('lodash');
var nconf = require('nconf');
var Boom = require('boom');
var validators = require('../../support/validators');

var panel = require('../../support/panel');
var datasetRoute = require('./../models/dataset');
var utilities = require('../utilities');

exports.init = function (server, models) {

    server.route(createPanelRoute(server, models));
    server.route(csvPanelRoute());
    server.route(jsonPanelRoute(server));
    server.route(eventFindRoute(server, models));

    server.method('getPanel',
        function (resourceType, id, rows, filters, callback) {
            var datasetIdKey = {
                event: 'datasetId',
                dataset: 'id'
            };

            models[resourceType]
                .findOne({where: {id: id}})
                .then(function (resource) {
                    if (resource) {
                        getPanelBounded(
                            server,
                            resource[datasetIdKey[resourceType]],
                            rows,
                            resource.startTime,
                            resource.endTime,
                            filters,
                            callback);
                    } else {
                        callback(Boom.notFound());
                    }
                })
                .catch(function (err) {
                    callback(Boom.badRequest(err));
                });
        });
};

function getPanelBounded(server, id, rows, startTime, endTime, filters,
                         callback) {
    var options = {
        rows: rows,
        panel: {},
        properties: {},
        startTime: startTime,
        endTime: endTime,
        filters: filters
    };
    panel.readPanelJSON(server, id, options, callback);
}

function createPanelRoute(server, models) {
    // TODO(SRLM): Should this route have a response model?
    return {
        method: 'POST',
        path: '/dataset/',
        config: {
            payload: {
                maxBytes: 1024 * 1024 * 200,
                output: 'stream',
                parse: true
            },
            handler: function (request, reply) {
                var newDataset = {
                    title: request.payload.title,
                    userId: request.payload.userId,
                    sport: request.payload.sport,
                    tags: request.payload.tags
                };

                panel.create(server, models, newDataset, request.payload.rnc,
                    function (err, createdDataset) {
                        if (err) {
                            reply(err);
                        } else {
                            utilities
                                .replyMetadata(request, reply, createdDataset);
                        }
                    });
            },
            validate: {
                payload: {
                    // For whatever reason, when I tried _.extend to use the
                    // dataset resource create model and the file validation
                    // together they didn't both come through. So, we have
                    // to hard code the requirements.
                    rnc: validators.stream.required(),
                    title: datasetRoute.model.title.required(),
                    userId: datasetRoute.model.userId.required(),
                    sport: datasetRoute.model.sport,
                    tags: datasetRoute.model.tags
                }
            },
            description: 'Create new dataset',
            notes: 'Upload an RNC and generate a new dataset.',
            tags: ['api'],
            auth: {
                scope: 'admin'
            }
        }
    };
}

function csvPanelRoute() {
    return {
        method: 'GET',
        path: '/dataset/{id}/csv',
        handler: function (request, reply) {
            var options = {};
            if (_.has(request.query, 'csPeriod')) {
                options.csPeriod = request.query.csPeriod;
            }
            if (_.has(request.query, 'frequency')) {
                options.csPeriod = Math.round(1000 / request.query.frequency);
            }
            if (_.has(request.query, 'startTime') &&
                _.has(request.query, 'endTime')) {
                options.startTime = request.query.startTime;
                options.endTime = request.query.endTime;
            }
            if (_.has(request.query, 'axes')) {
                options.axes = request.query.axes.split(',');
            }

            panel.readPanelCSV(request.params.id, options,
                function (err, resultStream) {
                    if (err) {
                        reply(err);
                    } else {
                        reply(resultStream)
                            .header('Content-Type', 'text/csv')
                            .header('Content-Disposition', 'attachment; ' +
                            'filename="dataset_' + request.params.id + '.csv"');
                    }
                });
        },
        config: {
            validate: {
                params: {
                    id: datasetRoute.model.id.required()
                },
                query: {
                    startTime: datasetRoute.model.startTime,
                    endTime: datasetRoute.model.endTime,
                    csPeriod: Joi.number().integer().min(1).default(10)
                        .description('Period of the rows, in milliseconds'),
                    frequency: Joi.number().integer().min(1).max(1000)
                        .description('Frequency (Hz) Rounded to milliseconds'),
                    axes: Joi.string()
                        .description('CSV list of axes to return.')
                }
            },
            description: 'Get CSV panel',
            notes: 'Request a "raw" CSV panel. Large download (100s of MB)',
            tags: ['api'],
            auth: {
                scope: 'trusted'
            }
        }
    };
}

function jsonPanelRoute(server) {
    return {
        method: 'GET',
        path: '/{resourceType}/{id}/json',
        handler: function (request, reply) {
            var finalHandler = function (err, result) {
                if (err) {
                    reply(err);
                } else {
                    reply(result);
                }
            };

            var filters = null;
            if (request.query.filteracceleration) {
                filters = filters || {};
                console.log('Setting acceleration filter');
                filters.acceleration = request.query.filteracceleration;
            }
            if (request.query.filterrotationrate) {
                filters = filters || {};
                filters.rotationrate = request.query.filterrotationrate;
            }
            if (request.query.filtermagneticfield) {
                filters = filters || {};
                filters.magneticfield = request.query.filtermagneticfield;
            }

            if (request.query.startTime &&
                request.query.endTime &&
                request.params.resourceType === 'dataset') {
                var rows = nconf.get('panelSizeMap')[request.query.size];
                if (request.query.rows) {
                    rows = request.query.rows;
                }

                getPanelBounded(
                    server,
                    request.params.id,
                    rows,
                    request.query.startTime,
                    request.query.endTime,
                    filters,
                    finalHandler
                );
            } else {
                server.methods.getPanel(
                    request.params.resourceType,
                    request.params.id,
                    nconf.get('panelSizeMap')[request.query.size],
                    filters,
                    finalHandler
                );
            }
        },
        config: {
            validate: {
                params: {
                    resourceType: Joi.string().valid(['dataset', 'event'])
                        .description('The resource type to get a panel for.'),
                    id: datasetRoute.model.id.required()
                },
                query: _.extend({}, {
                    size: Joi.string()
                        .valid(Object.keys(nconf.get('panelSizeMap')))
                        .default('lg')
                        .description('The general resolution of the panel.'),
                    rows: Joi.number().integer().min(1).max(10000)
                        .default(1000)
                        .description('The approximate number of output rows.'),
                    startTime: datasetRoute.model.startTime,
                    endTime: datasetRoute.model.endTime,
                    fields: validators.fields
                }, {
                    filteracceleration: Joi.number().min(0).max(1),
                    filterrotationrate: Joi.number().min(0).max(1),
                    filtermagneticfield: Joi.number().min(0).max(1)
                })
            },
            description: 'Get JSON panel',
            notes: 'Request a "processed" JSON panel. You can specify ' +
            'multiple algorithms to run, and each will be added under their ' +
            'own key. Note that if your frequency is too low then the result ' +
            'panel can be very large.',
            tags: ['api'],
            auth: {
                scope: 'basic'
            }
        }
    };
}

function eventFindRoute(server, models) {
    return {
        method: 'POST',
        path: '/dataset/{id}/eventfind',
        handler: function (request, reply) {
            models.dataset
                .findOne({where: {id: request.params.id}})
                .then(function (dataset) {

                    if (dataset) {
                        panel.runEventFinder(server, models, dataset.id,
                            dataset.startTime, dataset.endTime,
                            function (err, createdEvents) {
                                if (err) {
                                    request.log(['error'],
                                        'runEventFinder error: ' + err);
                                }
                            });
                        reply({message: 'processing started.'});
                    } else {
                        reply(Boom.notFound('dataset ' + request.params.id +
                        ' not found'));
                    }
                })
                .catch(function (err) {
                    reply(err);
                });

        },
        config: {
            validate: {
                params: {
                    id: datasetRoute.model.id.required()
                }
            },
            description: 'Red9 Event Finding Algorithm',
            notes: 'Run Red9 event finding algorithms on the given dataset. ' +
            'Since this operation typically takes quite a while (up to 500 ' +
            'seconds), this route gives a reply after some basic checks ' +
            '(panel exists, etc.) but before prcoessing has finished.',
            tags: ['api'],
            auth: {
                scope: 'admin'
            }
        }
    };
}
