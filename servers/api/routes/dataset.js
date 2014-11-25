"use strict";

var Joi = require('joi');
var _ = require('underscore')._;
var nconf = require('nconf');
var Boom = require('boom');
var validators = require('../resources/validators');
var routeHelp = require('../support/routehelp');

exports.init = function (server, resource) {
    // Convenient handles
    var models = resource.dataset.models;
    var model = models.model;
    var resultModel = models.resultModel;

    // ------------------------------------------------------------------------
    // Panel operations
    // ------------------------------------------------------------------------

    // TODO(SRLM): Should this route have a response model?
    server.route({
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
                    ownerId: request.payload.ownerId
                };

                resource.helpers.createDataset(newDataset, request.payload.rnc, function (err, createdDataset) {
                    if (err) {
                        reply(err);
                    } else {
                        reply(createdDataset);
                    }
                });
            },
            validate: {
                payload: {
                    // For whatever reason, when I tried _.extend to use the
                    // dataset resource create model and the file validation
                    // together they didn't both come through. So, we have
                    // to hard code the requirements.
                    rnc: validators.stream,
                    title: model.title.required(),
                    ownerId: model.ownerId.required()
                }
            },
            description: 'Create new dataset',
            notes: 'Upload an RNC and generate a new dataset.',
            tags: ['api'],
            auth: {
                scope: 'admin'
            }
        }
    });

    server.route({
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
            if (_.has(request.query, 'startTime') && _.has(request.query, 'endTime')) {
                options.startTime = request.query.startTime;
                options.endTime = request.query.endTime;
            }
            if (_.has(request.query, 'axes')) {
                options.axes = request.query.axes.split(',');
            }

            resource.panel.readPanelCSV(request.params.id, options, function (err, resultStream) {
                if (err) {
                    reply(err);
                } else {
                    reply(resultStream);
                }
            });

        },
        config: {
            validate: {
                params: {
                    id: model.id.required()
                },
                query: {
                    startTime: model.startTime,
                    endTime: model.endTime,
                    csPeriod: Joi.number().integer().min(1).default(10).description('Period of the rows, in milliseconds'),
                    frequency: Joi.number().integer().min(1).max(1000).description('Frequency in Hz. Rounded to the nearest even millisecond period.'),
                    axes: Joi.string().description('CSV list of axes to return.')
                }
            },
            description: 'Get CSV panel',
            notes: 'Request a "raw" CSV panel. Note that transfer sizes can be very large (thousands of rows, in the MB)',
            tags: ['api'],
            auth: {
                scope: 'trusted'
            }
        }
    });

    var getPanelBounded = function (id, rows, startTime, endTime, callback) {
        var options = {
            rows: rows,
            panel: {},
            properties: {},
            startTime: startTime,
            endTime: endTime
        };
        resource.panel.readPanelJSON(id, options, callback);
    };


    var getPanel = function (resourceType, id, rows, callback) {
        var datasetIdKey = {
            event: 'datasetId',
            dataset: 'id'
        };

        var resourceTemp;
        resource[resourceType].find({id: id}, {},
            function (resourceTemp_) {
                resourceTemp = resourceTemp_;
            },
            function (err, resultRows) {
                if (resultRows !== 1) {
                    callback(Boom.notFound());
                } else {
                    getPanelBounded(resourceTemp[datasetIdKey[resourceType]],
                        rows,
                        resourceTemp.startTime,
                        resourceTemp.endTime,
                        callback);
                }
            });
    };
    server.method('getPanel', getPanel, {cache: nconf.get('panelCacheOptions')});


    server.route({
        method: 'GET',
        path: '/{resourceType}/{id}/json',
        handler: function (request, reply) {
            var fields = routeHelp.getFieldsFromQuery(request.query);

            var finalHandler = function (err, result) {
                if (err) {
                    reply(err);
                } else {
                    reply(routeHelp.filterFields(fields, result));
                }
            };

            if (request.query.startTime && request.query.endTime && request.params.resourceType === 'dataset') {
                var rows = nconf.get('panelSizeMap')[request.query.size];
                if (request.query.rows) {
                    rows = request.query.rows;
                }

                getPanelBounded(
                    request.params.id,
                    rows,
                    request.query.startTime,
                    request.query.endTime,
                    finalHandler
                );
            } else {
                server.methods.getPanel(
                    request.params.resourceType,
                    request.params.id,
                    nconf.get('panelSizeMap')[request.query.size],
                    finalHandler
                );
            }
        },
        config: {
            validate: {
                params: {
                    resourceType: Joi.string().valid(['dataset', 'event']).description('The resource type to get a panel for.'),
                    id: model.id.required()
                },
                query: {
                    size: Joi.string().valid(Object.keys(nconf.get('panelSizeMap'))).description('The resolution (result size) of the panel.'),
                    rows: Joi.number().integer().min(1).max(10000).default(1000).description('The approximate number of output rows.'),
                    startTime: model.startTime,
                    endTime: model.endTime,
                    fields: validators.fields
                }
            },
            description: 'Get JSON panel',
            notes: 'Request a "processed" JSON panel. You can specify multiple algorithms to run, and each will be added under their own key. Note that if your frequency is too low then the result panel can be very large.',
            tags: ['api'],
            auth: {
                scope: 'basic'
            }
        }
    });

    server.route({
        method: 'POST',
        path: '/dataset/{id}/eventfind',
        handler: function (request, reply) {
            var dataset;
            resource.dataset.find({id: request.params.id}, {},
                function (dataset_) {
                    dataset = dataset_;
                },
                function (err, rowCount) {
                    if (err) {
                        reply(err);
                    } else {
                        resource.panel.runEventFinder(dataset.id, dataset.startTime, dataset.endTime,
                            function (err, createdEvents) {
                                if (err) {
                                    request.log(['error'], 'runEventFinder error: ' + err);
                                }
                            });
                        reply({message: 'processing started.'});
                    }
                });
        },
        config: {
            validate: {
                params: {
                    id: model.id.required()
                }
            },
            description: 'Red9 Event Finding Algorithm',
            notes: 'Run Red9 event finding algorithms on the given dataset. Since this operation typically takes quite a while (up to 500 seconds), this route gives a reply after some basic checks (panel exists, etc.) but before prcoessing has finished.',
            tags: ['api'],
            auth: {
                scope: 'admin'
            }
        }
    });
};