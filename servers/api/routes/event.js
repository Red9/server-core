var Joi = require('joi');
var stream = require('stream');

var routeHelp = require('./../support/routehelp');

var _ = require('underscore')._;


exports.init = function (server, resource) {
    var listResponse = routeHelp.createListResponse(resource.event.find);

    var resultModelRaw = {
        id: routeHelp.idValidator,
        startTime: Joi.number().description('The event start time'),
        endTime: Joi.number(),
        datasetId: routeHelp.idValidator,
        type: Joi.string().description('The event type, free form string'),
        summaryStatistics: Joi.object().description('Statistics that describe this event'),
        source: Joi.object().description('information about the source that created this event')
    };

    var resultModel = Joi.object({
        id: resultModelRaw.id.required(),
        startTime: resultModelRaw.startTime.required(),
        endTime: resultModelRaw.endTime.required(),
        datasetId: resultModelRaw.datasetId.required(),
        type: resultModelRaw.type.required(),
        summaryStatistics: resultModelRaw.summaryStatistics.required(),
        source: resultModelRaw.source.required()

    }).options({
        className: 'event'
    });

    var resultModelList = Joi.array().includes(resultModel);

    server.route({
        method: 'GET',
        path: '/event/{id?}',
        handler: function (request, reply) {
            var filters = {};
            if (request.params.id) {
                filters.id = request.params.id;
            }

            routeHelp.checkAndAddQuery(filters, request.query,
                [ 'startTime', 'endTime', 'datasetId', 'type']);

            listResponse(filters, reply);
        },
        config: {
            validate: {
                params: {
                    id: routeHelp.idValidator
                },
                query: {
                    'startTime': resultModelRaw.startTime,
                    'startTime.gt': routeHelp.timestampValidator.description('Select events whose timestamp is greater than'),
                    'startTime.lt': routeHelp.timestampValidator.description('Select events whose timestamp is less than'),
                    'endTime': resultModelRaw.endTime,
                    'endTime.gt': routeHelp.timestampValidator,
                    'endTime.lt': routeHelp.timestampValidator,
                    'datasetId': resultModelRaw.datasetId,
                    'type': resultModelRaw.type
                }
            },
            description: 'Get event(s)',
            notes: 'Gets an event that matches the parameters.',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'POST',
        path: '/event/',
        handler: function (request, reply) {
            console.dir(request.payload);
            reply();
        },
        config: {
            validate: {
                payload: {
                    startTime: resultModelRaw.startTime.required(),
                    endTime: resultModelRaw.endTime.required(),
                    type: resultModelRaw.type.required(),
                    datasetId: resultModelRaw.datasetId.required()
                }
            },
            description: 'Create new event',
            notes: 'Create a new event on a dataset.',
            tags: ['api']
        }
    });

    server.route({
        method: 'PUT',
        path: '/event/{id}',
        handler: function (request, reply) {
            console.dir(request.payload);

            resource.event.update(request.params.id, request.payload, function (err) {
                if (err) {
                    console.log(err);
                    reply(err);
                } else {
                    reply();
                }

            });
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                },
                payload: {
                    startTime: resultModelRaw.startTime,
                    endTime: resultModelRaw.endTime,
                    type: resultModelRaw.type,
                    datasetId: resultModelRaw.datasetId
                }
            },
            description: 'Update event',
            notes: 'Update one or more fields of an event.',
            tags: ['api']
        }
    });

    server.route({
        method: 'DELETE',
        path: '/event/{id}',
        handler: function (request, reply) {
            resource.event.delete(request.params.id, function (err, deletedResource) {
                if (err) {
                    reply(err);
                } else {
                    reply();
                }
            });
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                }
            },
            description: 'Delete an event',
            notes: 'Delete a single event.',
            tags: ['api']
        }
    });
};