"use strict";

var Joi = require('joi');
var _ = require('underscore')._;
var nconf = require('nconf');
var Boom = require('boom');
var validators = require('../../support/validators');
//var routeHelp = require('../support/routehelp');


var panel = require('../../support/panel');

var datasetRoute = require('./../models/dataset');

exports.init = function (server, models) {
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
                    userId: request.payload.userId
                };

                panel.create(server, models, newDataset, request.payload.rnc, function (err, createdDataset) {
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
                    rnc: validators.stream.required(),
                    title: datasetRoute.model.title.required(),
                    userId: datasetRoute.model.userId.required()
                }
            },
            description: 'Create new dataset',
            notes: 'Upload an RNC and generate a new dataset.',
            tags: ['api']/*,
             auth: {
             scope: 'admin'
             }*/
        }
    });
    //
    //server.route({
    //    method: 'GET',
    //    path: '/dataset/{id}/csv',
    //    handler: function (request, reply) {
    //        var options = {};
    //        if (_.has(request.query, 'csPeriod')) {
    //            options.csPeriod = request.query.csPeriod;
    //        }
    //        if (_.has(request.query, 'frequency')) {
    //            options.csPeriod = Math.round(1000 / request.query.frequency);
    //        }
    //        if (_.has(request.query, 'startTime') && _.has(request.query, 'endTime')) {
    //            options.startTime = request.query.startTime;
    //            options.endTime = request.query.endTime;
    //        }
    //        if (_.has(request.query, 'axes')) {
    //            options.axes = request.query.axes.split(',');
    //        }
    //
    //        resource.panel.readPanelCSV(request.params.id, options, function (err, resultStream) {
    //            if (err) {
    //                reply(err);
    //            } else {
    //                reply(resultStream);
    //            }
    //        });
    //
    //    },
    //    config: {
    //        validate: {
    //            params: {
    //                id: route.models.id.required()
    //            },
    //            query: {
    //                startTime: route.models.startTime,
    //                endTime: route.models.endTime,
    //                csPeriod: Joi.number().integer().min(1).default(10).description('Period of the rows, in milliseconds'),
    //                frequency: Joi.number().integer().min(1).max(1000).description('Frequency in Hz. Rounded to the nearest even millisecond period.'),
    //                axes: Joi.string().description('CSV list of axes to return.')
    //            }
    //        },
    //        description: 'Get CSV panel',
    //        notes: 'Request a "raw" CSV panel. Note that transfer sizes can be very large (thousands of rows, in the MB)',
    //        tags: ['api'],
    //        auth: {
    //            scope: 'trusted'
    //        }
    //    }
    //});
    //
    var getPanelBounded = function (id, rows, startTime, endTime, callback) {
        var options = {
            rows: rows,
            panel: {},
            properties: {},
            startTime: startTime,
            endTime: endTime
        };
        panel.readPanelJSON(server, id, options, callback);
    };


    var getPanel = function (resourceType, id, rows, callback) {
        var datasetIdKey = {
            event: 'datasetId',
            dataset: 'id'
        };

        models.dataset
            .findOne({where: {id: id}})
            .then(function (resource) {
                if (resource) {
                    getPanelBounded(resource[datasetIdKey[resourceType]],
                        rows,
                        resource.startTime,
                        resource.endTime,
                        callback);
                } else {
                    callback(Boom.notFound());
                }
            })
            .catch(function (err) {
                callback(Boom.badRequest(err));
            });
    };
    server.method('getPanel', getPanel, {cache: nconf.get('panelCacheOptions')});


    server.route({
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
                    resourceType: Joi.string().valid(['dataset', 'event']).required().description('The resource type to get a panel for.'),
                    id: datasetRoute.model.id.required()
                },
                query: {
                    size: Joi.string().valid(Object.keys(nconf.get('panelSizeMap'))).description('The resolution (result size) of the panel.'),
                    rows: Joi.number().integer().min(1).max(10000).default(1000).description('The approximate number of output rows.'),
                    startTime: datasetRoute.model.startTime,
                    endTime: datasetRoute.model.endTime,
                    fields: validators.fields
                }
            },
            description: 'Get JSON panel',
            notes: 'Request a "processed" JSON panel. You can specify multiple algorithms to run, and each will be added under their own key. Note that if your frequency is too low then the result panel can be very large.',
            tags: ['api']/*,
             auth: {
             scope: 'basic'
             }*/
        }
    });
    //
    //server.route({
    //    method: 'POST',
    //    path: '/dataset/{id}/eventfind',
    //    handler: function (request, reply) {
    //        var dataset;
    //        resource.dataset.find({id: request.params.id}, {},
    //            function (dataset_) {
    //                dataset = dataset_;
    //            },
    //            function (err, rowCount) {
    //                if (err) {
    //                    reply(err);
    //                } else {
    //                    resource.panel.runEventFinder(dataset.id, dataset.startTime, dataset.endTime,
    //                        function (err, createdEvents) {
    //                            if (err) {
    //                                request.log(['error'], 'runEventFinder error: ' + err);
    //                            }
    //                        });
    //                    reply({message: 'processing started.'});
    //                }
    //            });
    //    },
    //    config: {
    //        validate: {
    //            params: {
    //                id: model.id.required()
    //            }
    //        },
    //        description: 'Red9 Event Finding Algorithm',
    //        notes: 'Run Red9 event finding algorithms on the given dataset. Since this operation typically takes quite a while (up to 500 seconds), this route gives a reply after some basic checks (panel exists, etc.) but before prcoessing has finished.',
    //        tags: ['api'],
    //        auth: {
    //            scope: 'admin'
    //        }
    //    }
    //});
};