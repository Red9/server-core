var Joi = require('joi');
var stream = require('stream');

var routeHelp = require('./../support/routehelp');

var _ = require('underscore')._;


exports.init = function (server, resource) {
    var listResponse = routeHelp.createListResponse(resource.event.find);

    // Convenient handles
    var models = resource.event.models;
    var model = models.model;
    var resultModel = models.resultModel;
    var resultModelList = Joi.array().includes(resultModel).options({className: 'eventList'});

    server.route({
        method: 'GET',
        path: '/event/',
        handler: function (request, reply) {
            var filters = {};

            _.each(request.query, function (value, key) {
                var keyParts = key.split('.');
                if (keyParts.length === 1) {
                    filters[key] = value;
                } else if (keyParts.length === 2) {
                    if (!_.has(filters, keyParts[0])) {
                        filters[keyParts[0]] = {};
                    }
                    if (keyParts[1] === 'lt') {
                        filters[keyParts[0]]['$lt'] = value;
                    } else if (keyParts[1] === 'gt') {
                        filters[keyParts[0]]['$gt'] = value;
                    }
                }
            });

            listResponse(filters, reply);
        },
        config: {
            validate: {
                query: models.search
            },
            description: 'Get events',
            notes: 'Gets all events that matches the parameters',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'GET',
        path: '/event/{id}',
        handler: function (request, reply) {
            var filters = {};
            filters.id = request.params.id;
            listResponse(filters, reply);
        },
        config: {
            validate: {
                params: {
                    id: model.id
                }
            },
            description: 'Get a single event',
            notes: 'Gets a single event that matches with the given id',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

    server.route({
        method: 'POST',
        path: '/event/',
        handler: routeHelp.simpleCreateHandler(resource.event.create),
        config: {
            validate: {
                payload: models.create
            },
            description: 'Create new event',
            notes: 'Create a new event on a dataset.',
            tags: ['api']
        }
    });

    server.route({
        method: 'PUT',
        path: '/event/{id}',
        handler: routeHelp.simpleUpdateHandler(resource.event.update),
        config: {
            validate: {
                params: { id: model.id },
                payload: models.update
            },
            description: 'Update event',
            notes: 'Update one or more fields of an event.',
            tags: ['api']
        }
    });

    server.route({
        method: 'DELETE',
        path: '/event/{id}',
        handler: routeHelp.simpleDeleteHandler(resource.event.delete),
        config: {
            validate: {
                params: { id: model.id }
            },
            description: 'Delete an event',
            notes: 'Delete a single event.',
            tags: ['api']
        }
    });
};