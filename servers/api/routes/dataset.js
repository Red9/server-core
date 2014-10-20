//var panel = require('red9panel').panelReader(panelReaderConfig);
var Joi = require('joi');
var routeHelp = require('./../support/routehelp');

var panelConfig = {
    dataPath: '/home/clewis/Downloads/RNC'
};
var panel = require('red9panel').panelReader(panelConfig);


exports.init = function (server, resource) {
    var listResponse = routeHelp.createListResponse(resource.dataset.find);

    var resultModelRaw = {
        id: routeHelp.idValidator.description('resource UUID'),
        startTime: routeHelp.timestampValidator.description('the dataset start time'),
        endTime: routeHelp.timestampValidator.description('the dataset end time'),
        owner: routeHelp.idValidator.description('the user id of the dataset owner'),
        title: Joi.string().description('the human readable title of this dataset'),
        summaryStatistics: Joi.object().description('statistics that describe this dataset'),
        timezone: Joi.string().description('timezone information. Not used at this time.'),
        source: Joi.object().description('the RNC source information'),
        createTime: routeHelp.timestampValidator.description('the time that this dataset was uploaded')
    };

    var resultModel = Joi.object({
        id: resultModelRaw.id.required(),
        owner: resultModelRaw.owner.required(),
        title: resultModelRaw.title.required(),
        createTime: resultModelRaw.createTime.required(),

        // These are part of the migration away from Cassandra panels, so they're not required yet
        summaryStatistics: resultModelRaw.summaryStatistics,
        timezone: resultModelRaw.timezone,
        source: resultModelRaw.source,
        startTime: resultModelRaw.startTime,
        endTime: resultModelRaw.endTime
    }).options({
        className: 'dataset'
    });

    var resultModelList = Joi.array().includes(resultModel);


    server.route({
        method: 'GET',
        path: '/dataset/{id?}',
        handler: function (request, reply) {
            var filters = {};
            if (request.params.id) {
                filters.id = request.params.id;
            }

            routeHelp.checkAndAddQuery(filters, request.query,
                []);
            listResponse(filters, reply);
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                },
                query: {

                }

            },
            description: 'Get dataset(s)',
            notes: 'Gets dataset(s) that match the given parameters.',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'PUT',
        path: '/dataset/{id}',
        handler: function (request, reply) {
            console.dir(request.payload);
            reply();
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                },
                payload: {
                    title: resultModelRaw.title,
                    owner: resultModelRaw.owner
                }
            },
            description: 'Update a dataset',
            notes: 'Update a dataset',
            tags: ['api']
        }
    });

    server.route({
        method: 'DELETE',
        path: '/dataset/{id}',
        handler: function (request, reply) {
            // Delete dataset, panel, and all associated resources.
            reply()
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                }
            },
            description: 'Delete a dataset',
            notes: 'Delete a singe dataset',
            tags: ['api']
        }
    });


    // ------------------------------------------------------------------------
    // Panel operations
    // ------------------------------------------------------------------------

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
                var filename = request.payload['rnc'].hapi.filename;

                var newDataset = {
                    title: request.payload.title,
                    owner: request.payload.owner
                };

                resource.dataset.create(newDataset, function (err, createdDataset) {
                    panel.createPanel(createdDataset.id, request.payload.rnc, function (err) {
                        if (err) {
                            reply(err);
                        } else {
                            reply(createdDataset);
                            panel.readPanelJSON(createdDataset.id, {
                                properties: {},
                                csPeriod: 1000000
                            }, function (err, result) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    resource.dataset.update(createdDataset.id, {
                                        startTime: result.startTime,
                                        endTime: result.endTime,
                                        summaryStatistics: {}
                                    }, function (err, updatedDataset) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    });
                                }
                            });
                        }
                    });
                    //reply(createdDataset);
                    /*panel.createPanel(id, request.payload.rnc, function (err) {
                     reply('Thanks');
                     });*/
                });
            },
            validate: {
                payload: {
                    rnc: Joi.required(),
                    title: resultModelRaw.title.required(),
                    owner: resultModelRaw.owner.required()
                }
            },
            description: 'Create new dataset',
            notes: 'Upload an RNC and generate a new dataset.',
            tags: ['api']
        }
    });


    server.route({
        method: 'GET',
        path: '/dataset/{id}/csv',
        handler: function (request, reply) {
            var resultStream = panel.readPanelCSV('B39F36');
            reply(resultStream);
            //reply('Thanks for your input: ' + request.params.id + ', ' + request.query.startTime);
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id.required()
                },
                query: {
                    startTime: resultModelRaw.startTime,
                    endTime: resultModelRaw.endTime,
                    axes: Joi.string(),
                    frequency: Joi.number().integer().min(1).max(1000)
                }
            },
            description: 'Get CSV panel',
            notes: 'Request a "raw" CSV panel. Note that transfer sizes can be very large (thousands of rows, in the MB)',
            tags: ['api']
        }
    });

    server.route({
        method: 'GET',
        path: '/dataset/{id}/json',
        handler: function (request, reply) {
            reply('Thanks for your input: ' + request.params.id + ', ' + request.query.startTime);
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id.required()
                },
                query: {
                    startTime: resultModelRaw.startTime,
                    endTime: resultModelRaw.endTime,
                    axes: Joi.string(),
                    buckets: Joi.number().integer().min(1).max(10000),
                    minmax: Joi.boolean()
                    // TODO (SRLM): Add
                    // - parts: panel, spectral, fft, distribution, comparison, ...
                }
            },
            description: 'Get JSON panel',
            notes: 'Request a "processed" JSON panel. You can specify multiple algorithms to run, and each will be added under their own key. Note that if your frequency is too low then the result panel can be very large.',
            tags: ['api']
        }
    });
};