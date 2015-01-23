'use strict';

var _ = require('lodash');
var validators = require('../support/validators');
var Boom = require('boom');

var fs = require('fs');
var path = require('path');
var routes = {};

var replyMetadata = require('../support/replyMetadata');

var aggregateStatistics = require('../support/aggregatestatistics');

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
 * @param {Object} server
 * @param {Object} models
 */
module.exports.init = function (server, models) {

    require('./extra/authentication').init(server, models);
    require('./extra/panel').init(server, models);
    require('./extra/eventtype').init(server);
    require('./extra/fcpxml').init(server, models);
    require('./extra/documentation').init(server, models);

    fs
        .readdirSync(path.join(__dirname, 'models'))
        .filter(function (file) {
            return (file.indexOf('.') !== 0) && (file !== 'index.js');
        })
        .forEach(function (file) {
            var route = require(path.join(__dirname, 'models', file));
            addRoute(server, models, route);
            routes[route.name] = route;
        });
};

function addRoute(server, models, route) {

    // All routes can get a resource by id
    server.route(getRoute(models, route));

    // All routes can delete a resource by id
    server.route(deleteRoute(models, route));

    if (route.operations.hasOwnProperty('search')) {
        server.route(searchRoute(models, route));
    }

    if (route.operations.hasOwnProperty('create')) {
        server.route(createRoute(models, route));
    }

    if (route.operations.hasOwnProperty('update')) {
        server.route(updateRoute(models, route));
    }

    if (route.operations.hasOwnProperty('updateCollection')) {
        _.each(route.operations.updateCollection, function (validator, key) {
            var payloadValidation = {};
            payloadValidation[key] = validator.required();

            server.route(
                addToCollection(models, route, payloadValidation, key)
            );
            server.route(
                removeFromCollection(models, route, payloadValidation, key)
            );
        });
    }
}

function notFoundError(route, request) {
    return Boom.notFound(route.name + ' ' + request.params.id + ' not found');
}

function getRoute(models, route) {
    return {
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
                    if (resource) {
                        replyMetadata(request, reply, resource, {});
                    } else {
                        reply(notFoundError(route, request));
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
                query: _.extend({},
                    route.resultOptions,
                    {
                        fields: validators.fields,
                        metaformat: validators.metaformat
                    })
            },
            description: 'Get a single ' + route.name,
            notes: 'Gets a single ' + route.name + ' that matches the given id',
            tags: ['api'],
            //response: {
            // The response validation is set so that Hapi Swagger can pull it
            // for documentation, but we don't actually want it to validate.
            // Why no validate? Because we'd have to add in all the expand keys.
            //schema: resultModel,
            //sample: 1,
            //failAction: 'log'
            //},
            auth: {
                scope: route.scopes.read
            }
        }
    };
}

function deleteRoute(models, route) {
    return {
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
                        reply(notFoundError(route, request));
                    } else {
                        replyMetadata(request, reply, {});
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
            tags: ['api'],
            auth: {
                scope: route.scopes.remove
            }
        }
    };
}

function searchRoute(models, route) {
    return {
        method: 'GET',
        path: '/' + route.name + '/',
        handler: function (request, reply) {
            var filters = {};

            var expand = extractExpandOption(request, models);

            // Make sure that we only iterate over search keys
            _.each(_.pick(request.query, _.keys(route.operations.search)),
                function (value, key) {
                    // This little hack works around the fact that we could have
                    // two named id path parameters: /resource/:id, and ?id=...
                    // It's mostly a server side hack for Angular's $Resource.
                    // so, that's that.
                    if (key === 'idList') {
                        key = 'id';
                    }

                    // Search queries to Sequelize require Dates
                    // for the timestamps. So we need to pull the metadata
                    // about the search key and see if it's a timestamp. If it
                    // is we'll preemptively convert it to a date here.
                    // It's a bit hacky that we have to get index [0]. I suppose
                    // that's a joi thing... We'll see if it bites me.

                    var searchOptions = ['gt', 'lt', 'gte', 'lte'];
                    var searchComparison;
                    var searchJoi = route.operations.search[key];
                    if (searchJoi.describe().meta) {
                        if (searchJoi.describe().meta[0].timestamp === true) {
                            value = new Date(value);
                        } else if (searchJoi.describe().meta[0].textSearch ===
                            true) {
                            searchComparison = 'ilike';
                            value = '%' + value + '%';
                        }
                    }

                    var keyParts = key.split('.');
                    if (searchOptions
                            .indexOf(keyParts[keyParts.length - 1]) !== -1) {
                        searchComparison = keyParts[keyParts.length - 1];
                        key = keyParts.slice(0, -1).join('.');
                    }

                    if (!searchComparison) {
                        if (_.isArray(value)) {
                            filters[key] = {
                                overlap: value
                            };
                        } else if (_.isString(value) &&
                            value.split(',').length > 1) { // CSV list
                            filters[key] = {
                                in: value.split(',')
                            };
                        } else {
                            filters[key] = value;
                        }
                    } else if (searchComparison) {
                        if (!filters.hasOwnProperty(key)) {
                            filters[key] = {};
                        }
                        filters[key][searchComparison] = value;
                    }
                });

            var resources;
            var count;
            var query = {
                include: expand,
                where: filters
            };

            models[route.name].findAll(query)
                .then(function (resources_) {
                    resources = resources_;
                    return models[route.name].count(query);
                })
                .then(function (count_) {
                    count = count_;
                    var meta = {
                        total: count
                    };

                    if (request.query.aggregateStatistics === true) {
                        meta.aggregateStatistics = aggregateStatistics(
                            resources,
                            request.query.aggregateStatisticsGroupBy
                        );
                    }

                    replyMetadata(request, reply, resources, meta);
                })
                .catch(function (err) {
                    reply(Boom.badRequest(err));
                });
        },
        config: {
            validate: {
                query: _.extend({},
                    route.operations.search,
                    route.resultOptions,
                    route.metaOptions,
                    {
                        fields: validators.fields,
                        metaformat: validators.metaformat
                    }
                )
            },
            description: 'Get ' + route.name + 's',
            notes: 'Gets all ' + route.name + 's that matches the parameters',
            tags: ['api'],
            auth: {
                scope: route.scopes.search
            }
            //response: {schema: resultModelList}
        }
    };
}

function createRoute(models, route) {
    return {
        method: 'POST',
        path: '/' + route.name + '/',
        handler: function (request, reply) {
            models[route.name].create(request.payload)
                .then(function (resource) {
                    replyMetadata(request, reply, resource);
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
            tags: ['api'],
            auth: {
                scope: route.scopes.create
            }
        }
    };
}

function updateRoute(models, route) {
    return {
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
                    // Response is an array whose first element is the number of
                    // affected results, and the second element is an array of
                    // the items affected.
                    var affectedCount = response[0];
                    var affectedResource = response[1][0];
                    if (affectedCount === 0) {
                        reply(notFoundError(route, request));
                    } else {
                        replyMetadata(request, reply, affectedResource);
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
            tags: ['api'],
            auth: {
                scope: route.scopes.update
            }
        }
    };
}

function addToCollection(models, route, payloadValidation, key) {
    return {
        method: 'PUT',
        path: '/' + route.name + '/{id}/' + key,
        handler: function (request, reply) {
            models[route.name]
                .findOne({where: {id: request.params.id}})
                .then(function (resource) {
                    if (!resource) {
                        reply(notFoundError(route, request));
                    } else {
                        resource[key] =
                            resource[key].concat(request.payload[key]);
                        resource.save();
                        replyMetadata(request, reply, {});
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
            tags: ['api'],
            auth: {
                scope: route.scopes.collection.update
            }
        }
    };
}

function removeFromCollection(models, route, payloadValidation, key) {
    return {
        method: 'PATCH',
        path: '/' + route.name + '/{id}/' + key,
        handler: function (request, reply) {
            models[route.name]
                .findOne({where: {id: request.params.id}})
                .then(function (resource) {
                    if (!resource) {
                        reply(notFoundError(route, request));
                    } else {
                        resource[key] =
                            _.difference(resource[key], request.payload[key]);
                        resource.save();
                        replyMetadata(request, reply, {});
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
            notes: 'Remove items from collection ' + key + ' on ' + route.name,
            tags: ['api'],
            auth: {
                scope: route.scopes.collection.remove
            }
        }
    };
}
