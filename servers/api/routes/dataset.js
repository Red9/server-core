//var panel = require('red9panel').panelReader(panelReaderConfig);
var Joi = require('joi');
var _ = require('underscore')._;
var nconf = require('nconf');

//var panelConfig = {
//    dataPath: nconf.get('rncDataPath')
//};
//var panel = require('red9panel').panelReader(panelConfig);

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
                var filename = request.payload['rnc'].hapi.filename;

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
                    rnc: Joi.required(),
                    title: model.title.required(),
                    ownerId: model.ownerId.required()
                }
            },
            description: 'Create new dataset',
            notes: 'Upload an RNC and generate a new dataset.',
            tags: ['api']
        }
    });

    server.route({
        method: 'PUT',
        path: '/dataset/{id}/tags',
        config: {
            handler: function (request, reply) {
                console.log('Add a tag: ' + request.params.id + ': ' + request.payload.tags);
                reply('Add a tag: ' + request.params.id + ': ' + request.payload.tags);
            },
            validate: {
                params: {
                    id: model.id.required()
                },
                payload: {
                    tags: Joi.string()
                }
            },
            description: 'Add a new tag to the dataset',
            notes: 'Add a single tag without modifying others.',
            tags: ['api']
        }
    });


    server.route({
        method: 'GET',
        path: '/dataset/{id}/csv',
        handler: function (request, reply) {
            // TODO(SRLM): Add this feature in fully.
            var resultStream = resource.panel.readPanelCSV(request.params.id);
            reply(resultStream);
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
            var options = {
                rows: request.query.rows,
                panel: {},
                properties: {},
                statistics: {}
            };

            if (_.has(request.query, 'startTime')) {
                options.startTime = request.query.startTime;
            }
            if (_.has(request.query, 'endTime')) {
                options.endTime = request.query.endTime;
            }

            resource.panel.readPanelJSON(request.params.id, options, function (err, result) {
                reply(result);
            });
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
                    rows: Joi.number().integer().min(1).max(10000).default(1000).description('The approximate number of output rows.')
                    //axes: Joi.string(),
                    //minmax: Joi.boolean()
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