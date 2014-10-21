//var panel = require('red9panel').panelReader(panelReaderConfig);
var Joi = require('joi');
var routeHelp = require('./../support/routehelp');
var _ = require('underscore')._;
var nconf = require('nconf');

var panelConfig = {
    dataPath: nconf.get('rncDataPath')
};
var panel = require('red9panel').panelReader(panelConfig);


exports.init = function (server, resource) {
    var queryWithListResponse = routeHelp.createListResponse(resource.dataset.find);

    // Convenient handles
    var models = resource.dataset.models;
    var model = resource.dataset.models.model;
    var resultModel = resource.dataset.models.resultModel;
    var resultModelList = Joi.array().includes(resultModel).options({className: 'datasetList'});


    server.route({
        method: 'GET',
        path: '/dataset/',
        handler: function (request, reply) {
            // use routeHelp.checkAndAddQuery here when I add route options...
            var filters = {};

            routeHelp.checkAndAddQuery(filters, request.query,
                [ 'startTime', 'endTime', 'owner', 'title']);

            queryWithListResponse(filters, reply);
        },
        config: {
            validate: {
                query: {
                    'startTime': model.startTime,
                    'startTime.gt': model.startTime.description('Select datasets that begin after a given time'),
                    'startTime.lt': model.startTime.description('Select datasets that begin before a given time'),
                    'endTime': model.endTime,
                    'endTime.gt': model.endTime.description('Select datasets that end after a given time'),
                    'endTime.lt': model.endTime.description('Select datasets that end before a given time'),
                    'owner': model.owner,
                    'title': model.title
                }
            },
            description: 'Get all dataset(s) that match query',
            notes: 'Gets dataset(s) that match the given parameters.',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'GET',
        path: '/dataset/{id}',
        handler: routeHelp.simpleGetSingleHandler(queryWithListResponse),
        config: {
            validate: {
                params: {
                    id: model.id
                }
            },
            description: 'Get a single dataset',
            notes: 'Get a single dataset with given id',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'PUT',
        path: '/dataset/{id}',
        handler: routeHelp.simpleUpdateHandler(resource.dataset.update),
        config: {
            validate: {
                params: { id: model.id },
                payload: models.update
            },
            description: 'Update a dataset',
            notes: 'Update a dataset',
            tags: ['api']
        }
    });

    server.route({
        method: 'DELETE',
        path: '/dataset/{id}',
        handler: routeHelp.simpleDeleteHandler(resource.dataset.delete),
        config: {
            validate: {
                params: { id: model.id }
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
                    // For whatever reason, when I tried _.extend to use the
                    // dataset resource create model and the file validation
                    // together they didn't both come through. So, we have
                    // to hard code the requirements.
                    rnc: Joi.required(),
                    title: model.title.required(),
                    owner: model.owner.required()
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
                    id: model.id.required()
                },
                query: {
                    startTime: model.startTime,
                    endTime: model.endTime,
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
                    id: model.id.required()
                },
                query: {
                    startTime: model.startTime,
                    endTime: model.endTime,
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