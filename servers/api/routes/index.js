"use strict";

var _ = require('underscore')._;
var validators = require('../support/validators');
var Boom = require('boom');

var fs = require("fs");
var path = require("path");
var routes = {};

function extractExpandOption(request, models) {
    var expand = [];
    _.each(request.query.expand, function (e) {
        expand.push(models[e]);
    });
    delete request.query.expand;
    return expand;
}


/** Scan current folder and add all other .js files as routes.
 *
 * @param server
 * @param models
 */
module.exports.init = function (server, models) {
    fs
        .readdirSync(path.join(__dirname, 'models'))
        .filter(function (file) {
            return (file.indexOf(".") !== 0) && (file !== "index.js");
        })
        .forEach(function (file) {
            var route = require(path.join(__dirname, 'models', file));
            addRoute(server, models, route);

            console.log('Creating route ' + route.name);
            routes[route.name] = route;
        });

    require('./extra/panel').init(server, models);
    require('./extra/eventtype').init(server);
    require('./extra/fcpxml').init(server, models);
    require('./extra/authentication').init(server, models);

    console.log('Loaded routes...');
};

function addRoute(server, models, route) {

    // All routes can get a resource by id
    server.route({
        method: 'GET',
        path: '/' + route.name + '/{id}',
        handler: function (request, reply) {
            var expand = extractExpandOption(request, models);
            models[route.name].find(
                {
                    include: expand,
                    where: {id: request.params.id}
                })
                .then(function (resource) {
                    reply(resource);
                })
                .catch(function (err) {
                    reply(Boom.badRequest(err));
                });
        },
        config: {
            validate: {
                params: {
                    id: route.model.id.required()
                },
                query: _.extend({}, route.resultOptions, {fields: validators.fields})
            },
            description: 'Get a single ' + route.name,
            notes: 'Gets a single ' + route.name + ' that matches the given id',
            tags: ['api']/*,
             response: {
             // The response validation is set so that Hapi Swagger can pull it
             // for documentation, but we don't actually want it to validate.
             // Why no validate? Because we'd have to add in all the expand keys...
             schema: resultModel,
             sample: 1,
             failAction: 'log'
             },
             auth: {
             scope: resource.scopes.read
             }*/
        }
    });

    // All routes can delete a resource by id
    server.route({
        method: 'DELETE',
        path: '/' + route.name + '/{id}',
        handler: function (request, reply) {
            models[route.name]
                .destroy({
                    where: {
                        id: request.params.id
                    }
                })
                .then(function (deleteCount) {
                    if (deleteCount === 0) {
                        reply(Boom.notFound(route.name + ' ' + request.params.id + ' not found'));
                    } else {
                        reply({});
                    }
                })
                .catch(function (err) {
                    reply(Boom.badRequest(err));
                });
        },
        config: {
            validate: {
                params: {
                    id: route.model.id.required()
                }
            },
            description: 'Delete ' + route.name,
            notes: 'Delete a single ' + route.name,
            tags: ['api']/*,
             auth: {
             scope: resource.scopes.remove
             }*/
        }
    });

    if (route.operations.hasOwnProperty('search')) {
        server.route({
            method: 'GET',
            path: '/' + route.name + '/',
            handler: function (request, reply) {
                var filters = {};

                var expand = extractExpandOption(request, models);

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
                        if (_.isArray(value)) {
                            filters[key] = {
                                overlap: value
                            };
                        } else if (_.isString(value) && value.split(',').length > 1) { // CSV list
                            if (!filters.hasOwnProperty(key)) {
                                filters[key] = {};
                            }
                            filters[key] = {
                                in: value.split(',')
                            };
                        } else {
                            // Search queries to Sequelize require Dates
                            // for the timestamps. So we need to pull the metadata
                            // about the search key and see if it's a timestamp. If it
                            // is we'll preemptively convert it to a date here.
                            // It's a bit hacky that we have to get index [0]. I suppose that's a
                            // joi thing... We'll see if it bites me.
                            if (route.operations.search[key].describe().meta && // make sure it's defined
                                route.operations.search[key].describe().meta[0].timestamp === true) {
                                filters[key] = new Date(value);
                            } else {
                                filters[key] = value;
                            }
                        }
                    } else if (keyParts.length === 2) {
                        if (!filters.hasOwnProperty(keyParts[0])) {
                            filters[keyParts[0]] = {};
                        }

                        console.log('Key metadata:');
                        console.dir(route.operations.search[key].describe().meta);
                        console.log('Is it a timestamp? ' + route.operations.search[key].describe().meta[0].timestamp === true);

                        // See note above about meta, index, and timestamp.
                        if (route.operations.search[key].describe().meta > 0 &&
                            route.operations.search[key].describe().meta[0].timestamp === true) {
                            filters[keyParts[0]][keyParts[1]] = new Date(value);
                        } else {
                            filters[keyParts[0]][keyParts[1]] = value;
                        }

                    }

                });

                console.log('---------------------------------------');
                console.dir(filters);

                models[route.name].findAll(
                    {
                        include: expand,
                        where: filters
                    })
                    .then(function (resource) {
                        reply(resource);
                    })
                    .catch(function (err) {
                        reply(Boom.badRequest(err));
                    });
            },
            config: {
                validate: {
                    query: _.extend({}, route.operations.search, route.resultOptions, {fields: validators.fields})
                },
                description: 'Get ' + route.name + 's',
                notes: 'Gets all ' + route.name + 's that matches the parameters',
                tags: ['api']
                //auth: {
                //    scope: resource.scopes.search
                //}
                //response: {schema: resultModelList}
            }
        });
    }

    if (route.operations.hasOwnProperty('create')) {
        server.route({
            method: 'POST',
            path: '/' + route.name + '/',
            handler: function (request, reply) {
                models[route.name].create(request.payload)
                    .then(function (resource) {
                        reply(resource);
                    })
                    .catch(function (err) {
                        reply(Boom.badRequest(err));
                    });
            },
            config: {
                validate: {
                    payload: route.operations.create
                },
                description: 'Create new ' + route.name,
                notes: 'Create new ' + route.name,
                tags: ['api']/*,
                 auth: {
                 scope: resource.scopes.create
                 }*/
            }
        });
    }

    if (route.operations.hasOwnProperty('update')) {
        server.route({
            method: 'PUT',
            path: '/' + route.name + '/{id}',
            handler: function (request, reply) {
                models[route.name]
                    .update(request.payload, {
                        returning: true,
                        where: {
                            id: request.params.id
                        }
                    })
                    .then(function (response) {
                        // Response is an array whose first element is the number of affected
                        // results, and the second element is an array of the items affected.
                        var affectedCount = response[0];
                        var affectedResource = response[1][0];
                        if (affectedCount === 0) {
                            reply(Boom.notFound(route.name + ' ' + request.params.id + ' does not exist.'));
                        } else {
                            reply(affectedResource);
                        }
                    })
                    .catch(function (err) {
                        reply(Boom.badRequest(err));
                    });
            },
            config: {
                validate: {
                    params: {
                        id: route.model.id.required()
                    },
                    payload: route.operations.update
                },
                description: 'Update ' + route.name,
                notes: 'Update one or more fields of a single ' + route.name,
                tags: ['api']/*,
                 auth: {
                 scope: route.scopes.update
                 }*/
            }
        });
    }


    if (route.operations.hasOwnProperty('updateCollection')) {
        _.each(route.operations.updateCollection, function (validator, key) {
            var payloadValidation = {};
            payloadValidation[key] = validator.required();

            server.route({
                method: 'PUT',
                path: '/' + route.name + '/{id}/' + key,
                handler: function (request, reply) {
                    models[route.name]
                        .findOne({where: {id: request.params.id}})
                        .then(function (resource) {
                            if (!resource) {
                                reply(Boom.notFound(route.name + ' ' + request.params.id + ' not found'));
                            } else {

                                resource[key] = resource[key].concat(request.payload[key]);

                                console.log('New array: ' + resource[key]);
                                resource.save();

                                reply({});
                            }
                        })
                        .catch(function (err) {
                            reply(Boom.badRequest(err));
                        });

                },
                config: {
                    validate: {
                        params: {
                            id: route.model.id.required()
                        },
                        payload: payloadValidation
                    },
                    description: 'Add ' + route.name + ' ' + key,
                    notes: 'Add items to collection ' + key + ' on ' + route.name,
                    tags: ['api']/*,
                     auth: {
                     scope: resource.scopes.collection.update
                     }*/
                }
            });

            server.route({
                method: 'PATCH',
                path: '/' + route.name + '/{id}/' + key,
                handler: function (request, reply) {
                    models[route.name]
                        .findOne({where: {id: request.params.id}})
                        .then(function (resource) {
                            if (!resource) {
                                reply(Boom.notFound(route.name + ' ' + request.params.id + ' not found'));
                            } else {
                                resource[key] = _.difference(resource[key], request.payload[key])

                                console.log('New array: ' + resource[key]);
                                resource.save();

                                reply({});
                            }
                        })
                        .catch(function (err) {
                            reply(Boom.badRequest(err));
                        });
                },
                config: {
                    validate: {
                        params: {
                            id: route.model.id.required()
                        },
                        payload: payloadValidation
                    },
                    description: 'Remove ' + route.name + ' ' + key,
                    notes: 'Remove items from collection ' + key + ' on ' + route.name + '. Note the method is PATCH.',
                    tags: ['api']/*,
                     auth: {
                     scope: resource.scopes.collection.remove
                     }*/
                }
            });

        });
    }

}