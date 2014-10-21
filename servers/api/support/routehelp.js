var stream = require('stream');
var Joi = require('joi');
var _ = require('underscore')._;

exports.createListResponse = function (findFunction) {
    return function (filters, reply) {
        var resultList = [];

        findFunction(filters, {},
            function (resource) {
                resultList.push(resource);
            },
            function (err, rowCount) {
                console.log('resultList.length: ' + resultList.length);
                reply(resultList);
            }
        );
    }
};

// Old, stream based version
// Stream based version is about 25% faster than array based version, but it
// doesn't support response validation
//exports.createListResponse = function (findFunction) {
//    return function (filters, reply) {
//        var outputStream = stream.Readable();
//        outputStream._read = function (size) {
//        };
//
//        var firstLine = true;
//        outputStream.push('[');
//        findFunction(filters, {},
//            function (resource) {
//                if (!firstLine) {
//                    outputStream.push(',');
//                } else {
//                    firstLine = false;
//                }
//                outputStream.push(JSON.stringify(resource));
//            },
//            function (err, rowCount) {
//                outputStream.push(']');
//                outputStream.push(null);
//            }
//        );
//
//        reply(outputStream);
//    }
//};

// This second regex (after the OR) is a legacy option!!! As it turns out, I haven't been using version 4
exports.idValidator = Joi.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$$/);
exports.timestampValidator = Joi.number().integer().min(0);

/** Takes care of the messy business of going from query string query to the format required by the database.
 *
 * Query strings query are like:
 *
 * key=value
 * key.lt=value
 * key.gt=value
 *
 * @param filters
 * @param query
 * @param key
 */
exports.checkAndAddQuery = function (filters, query, keys) {
    _.each(keys, function (key) {
        if (query[key]) {
            filters[key] = query[key];
        } else if (query[key + '.lt'] || query[key + '.gt']) {
            filters[key] = {};
            if (query[key + '.lt']) {
                filters[key]['$lt'] = query[key + '.lt'];
            }
            if (query[key + '.gt']) {
                filters[key]['$gt'] = query[key + '.gt'];
            }
        }
    });
};

exports.simpleCreateHandler = function (createFunction) {
    return function (request, reply) {
        createFunction(request.payload, function (err, createdResource) {
            if (err) {
                reply(err);
            } else {
                reply(createdResource);
            }
        });
    }
};

exports.simpleGetSingleHandler = function (queryWithListResponse) {
    return function (request, reply) {
        var filters = {};
        filters.id = request.params.id;
        queryWithListResponse(filters, reply);
    };
};

exports.simpleUpdateHandler = function (updateFunction) {
    return function (request, reply) {
        updateFunction(request.params.id, request.payload, function (err, updatedResource) {
            if (err) {
                reply(err);
            } else {
                reply(updatedResource);
            }
        });
    }
};

exports.simpleDeleteHandler = function (deleteFunction) {
    return function (request, reply) {
        deleteFunction(request.params.id, function (err, deletedResource) {
            if (err) {
                reply(err);
            } else {
                reply(deletedResource);
            }
        });
    }
};

exports.createSearchRoute = function(server, resource, searchKeys){
    var listResponse = routeHelp.createListResponse(resource.find);

    // Convenient handles
    var models = resource.models;
    var model = models.model;
    var resultModel = models.resultModel;
    var resultModelList = Joi.array().includes(resultModel).options({className: resource.name + 'List'});

    var queryKeys= {
    };



    server.route({
        method: 'GET',
        path: '/' + resource.name + '/',
        handler: function (request, reply) {
            var filters = {};

            routeHelp.checkAndAddQuery(filters, request.query,
                searchKeys);

            listResponse(filters, reply);
        },
        config: {
            validate: {
                query: {
                    email: model.email,
                    displayName: model.displayName
                }
            },
            description: 'Get users',
            notes: 'Gets all users that matches the parameters',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });
};

exports.createCRUDRoutes = function (server, resource) {
    var listResponse = exports.createListResponse(resource.find);

    // Convenient handles
    var models = resource.models;
    var model = models.model;
    var resultModel = models.resultModel;
    var resultModelList = Joi.array().includes(resultModel).options({className: resource.name + 'List'});

    server.route({
        method: 'GET',
        path: '/' + resource.name + '/',
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
            description: 'Get ' + resource.name,
            notes: 'Gets all ' + resource.name + ' that matches the parameters',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });


    server.route({
        method: 'GET',
        path: '/' + resource.name + '/{id}',
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
            description: 'Get a single ' + resource.name,
            notes: 'Gets a single ' + resource.name + ' that matches the given id',
            tags: ['api'],
            response: {schema: resultModelList}
        }
    });

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
                params: { id: model.id },
                payload: models.update
            },
            description: 'Update ' + resource.name,
            notes: 'Update one or more fields of a single ' + resource.name,
            tags: ['api']
        }
    });

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
                params: { id: model.id }
            },
            description: 'Delete ' + resource.name,
            notes: 'Delete a single ' + resource.name,
            tags: ['api']
        }
    });
};



