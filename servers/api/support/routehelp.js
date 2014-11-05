var stream = require('stream');
var Joi = require('joi');
var _ = require('underscore')._;

// Slow, array based version
//exports.createListResponse = function (findFunction) {
//    return function (filters, options, reply) {
//        var resultList = [];
//
//        findFunction(filters, options,
//            function (resource) {
//                resultList.push(resource);
//            },
//            function (err, rowCount) {
//                reply(resultList);
//            }
//        );
//    }
//};

// Fast, stream based version
// Stream based version is about 25% faster than array based version, but it
// doesn't support response validation
exports.createListResponse = function (findFunction) {
    return function (filters, options, reply) {
        var outputStream = stream.Readable();
        outputStream._read = function (size) {
        };

        var firstLine = true;
        outputStream.push('[\n');
        findFunction(filters, options,
            function (resource) {
                if (!firstLine) {
                    outputStream.push(',\n');
                } else {
                    firstLine = false;
                }
                outputStream.push(JSON.stringify(resource, null, 4));
            },
            function (err, rowCount) {
                outputStream.push('\n]');
                outputStream.push(null);
            }
        );

        reply(outputStream);
    }
};

// This second regex (after the OR) is a legacy option!!! As it turns out, I haven't been using version 4
//exports.idValidator = Joi.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$$/);
//exports.timestampValidator = Joi.number().integer().min(0);

exports.createCRUDRoutes = function (server, resource, routesToCreate) {
    if (typeof routesToCreate === 'undefined') {
        routesToCreate = ['create', 'read', 'update', 'delete', 'search'];
    }

    var listResponse = exports.createListResponse(resource.find);

    // Convenient handles
    var models = resource.models;
    var model = models.model;
    var resultModel = models.resultModel;
    var resultModelList = Joi.array().includes(resultModel).options({className: resource.name + 'List'});


    if (routesToCreate.indexOf('search') !== -1) {
        server.route({
            method: 'GET',
            path: '/' + resource.name + '/',
            handler: function (request, reply) {
                var filters = {};
                var options = {};

                _.each(request.query, function (value, key) {
                    // This little hack works around the fact that we could have two named
                    // id path parameters: /resource/:id, and ?id=...
                    // It's mostly a server side hack for Angular's $Resource.
                    // so, that's that.
                    if (key === 'idList') {
                        key = 'id';
                    }

                    var keyParts = key.split('.');
                    if (keyParts.length === 1) {
                        if (key === 'expand') {
                            options['$expand'] = value;
                        } else if (_.isArray(value)) {
                            if (!_.has(filters, '$and')) {
                                filters['$and'] = [];
                            }
                            _.each(value, function (v) {
                                var t = {};
                                t[key] = v;
                                filters['$and'].push(t);
                            });
                        } else if (value.split(',').length > 1) {
                            if (key === 'id') { // Cassandra limitation: we can only IN on primary key. See issue CASSANDRA-4386
                                filters.id = {
                                    '$in': value.split(',')
                                };
                            } else {
                                if (!_.has(filters, '$or')) {
                                    filters['$or'] = [];
                                }
                                _.each(value.split(','), function (v) {
                                    var t = {};
                                    t[key] = v;
                                    filters['$or'].push(t);
                                });
                            }
                        } else {
                            filters[key] = value;
                        }
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

                listResponse(filters, options, reply);
            },
            config: {
                validate: {
                    query: models.search
                },
                description: 'Get ' + resource.name + 's',
                notes: 'Gets all ' + resource.name + 's that matches the parameters',
                tags: ['api']
                //response: {schema: resultModelList}
            }
        });
    }

    if (routesToCreate.indexOf('read') !== -1) {
        server.route({
            method: 'GET',
            path: '/' + resource.name + '/{id}',
            handler: function (request, reply) {
                var filters = {};
                filters.id = request.params.id;
                listResponse(filters, {}, reply);
            },
            config: {
                validate: {
                    params: {
                        id: model.id
                    }
                },
                description: 'Get a single ' + resource.name,
                notes: 'Gets a single ' + resource.name + ' that matches the given id',
                tags: ['api']
                //response: {schema: resultModelList}
            }
        });
    }

    if (routesToCreate.indexOf('create') !== -1) {
        server.route({
            method: 'POST',
            path: '/' + resource.name + '/',
            handler: function (request, reply) {
                resource.create(request.payload, function (err, createdResource) {
                    if (err) {
                        reply(err);
                    } else {
                        reply(createdResource);
                    }
                });
            },
            config: {
                validate: {
                    payload: models.create
                },
                description: 'Create new ' + resource.name,
                notes: 'Create new ' + resource.name,
                tags: ['api']
            }
        });
    }

    if (routesToCreate.indexOf('update') !== -1) {
        server.route({
            method: 'PUT',
            path: '/' + resource.name + '/{id}',
            handler: function (request, reply) {
                resource.update(request.params.id, request.payload, function (err, updatedResource) {
                    if (err) {
                        reply(err);
                    } else {
                        reply(updatedResource);
                    }
                });
            },
            config: {
                validate: {
                    params: {id: model.id},
                    payload: models.update
                },
                description: 'Update ' + resource.name,
                notes: 'Update one or more fields of a single ' + resource.name,
                tags: ['api']
            }
        });
    }

    if (routesToCreate.indexOf('updateCollection') !== -1
        && _.has(models, 'updateCollection')) {
        _.each(models.updateCollection, function (validator, key) {
            console.log('Key ' + key);
            var payloadValidation = {};
            payloadValidation[key] = validator;

            server.route({
                method: 'PUT',
                path: '/' + resource.name + '/{id}/' + key,
                handler: function (request, reply) {
                    resource.collection.add(request.params.id, key, request.payload[key], function (err) {
                        console.log(err);
                        reply(err);
                    });
                },
                config: {
                    validate: {
                        params: {id: model.id},
                        payload: payloadValidation
                    },
                    description: 'Add ' + resource.name + ' ' + key,
                    notes: 'Add items to collection ' + key + ' on ' + resource.name,
                    tags: ['api']
                }
            });

            server.route({
                method: 'DELETE',
                path: '/' + resource.name + '/{id}/' + key,
                handler: function (request, reply) {
                    resource.collection.remove(request.params.id, key, request.payload[key], function (err) {
                        console.log(err);
                        reply(err);
                    });
                },
                config: {
                    validate: {
                        params: {id: model.id},
                        payload: payloadValidation
                    },
                    description: 'Remove ' + resource.name + ' ' + key,
                    notes: 'Remove items from collection ' + key + ' on ' + resource.name,
                    tags: ['api']
                }
            });

        });
    }


    if (routesToCreate.indexOf('delete') !== -1) {
        server.route({
            method: 'DELETE',
            path: '/' + resource.name + '/{id}',
            handler: function (request, reply) {
                resource.delete(request.params.id, function (err, deletedResource) {
                    if (err) {
                        reply(err);
                    } else {
                        reply(deletedResource);
                    }
                });
            },
            config: {
                validate: {
                    params: {id: model.id}
                },
                description: 'Delete ' + resource.name,
                notes: 'Delete a single ' + resource.name,
                tags: ['api']
            }
        });
    }
};



