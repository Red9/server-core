var underscore = require('underscore')._;
var validator = require('validator');

var resources = requireFromRoot('support/resources/resources');



function notAllowedFunction(req, res, next) {
    res.status(403).json(JSON.parse('{"message":"Function not available via this API."}'));
}


exports.addRoutesToApp = function(app, route) {
    var pathFunctions = {
        create: notAllowedFunction,
        search: notAllowedFunction,
        describe: notAllowedFunction,
        get: notAllowedFunction,
        update: notAllowedFunction,
        delete: notAllowedFunction
    };

    underscore.each(route.allowed, function(action) {
        pathFunctions[action] = function(req, res, next) {
            exports[action](route, req, res, next);
        };
    });

    app.post(route.root, pathFunctions.create);
    app.get(route.root, pathFunctions.search);
    app.get(route.root + 'describe', pathFunctions.describe);
    app.get(route.root + ':id', pathFunctions.get);
    app.put(route.root + ':id', pathFunctions.update);
    app.delete(route.root + ':id', pathFunctions.delete);

    if (typeof route.extraRoutes !== 'undefined') {
        underscore.each(route.extraRoutes, function(newRoute) {
            app[newRoute.method](newRoute.path, newRoute.handler);
        });
    }
};


function simplifyOutput(route, resourceArray) {
    underscore.each(resourceArray, function(element, index, list) {
        underscore.each(route.simplifyOutput, function(key) {
            delete element[key];
        });
    });
    return resourceArray;
}

exports.describe = function(route, req, res, next) {
    console.log('Describing route: ');
    res.json(resources[route.resource].resource.schema);
};

exports.search = function(route, req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    var expand;
    if (typeof req.query['expand'] !== 'undefined') {
        expand = req.query['expand'].split(',');
        delete req.query['expand'];
    }

    // At this point, req.query has constraints.

    resources[route.resource].get(req.query, function(resources) {
        if (simpleOutput) {
            resources = simplifyOutput(route, resources);
        }
        res.json(resources);
    }, expand);
};


exports.get = function(route, req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    var expand;
    if (typeof req.query['expand'] !== 'undefined') {
        expand = req.query['expand'].split(',');
        delete req.query['expand'];
    }

    // At this point, req.query has constraints.

    resources[route.resource].get({id: req.param('id')}, function(resources) {
        if (simpleOutput) {
            resources = simplifyOutput(route, resources);
        }
        res.json(resources);
    }, expand);
};


exports.create = function(route, req, res, next) {
    var schema = resources[route.resource].resource.schema;

    var newResource = {};
    underscore.each(schema, function(description, key) {
        if (description.includeToCreate === true) {
            var value = req.param(key);
            if (description.type === 'timestamp') {
                value = parseInt(value);
            }
            newResource[key] = value;
        }
    });

    console.log('newResource: ' + JSON.stringify(newResource));

    var lastKey = '';
    if (underscore.some(newResource, function(value, key) {
        lastKey = key;
        return typeof value === 'undefined';
    })) {
        res.status(403).json({message: 'Must include required parameters to create resource. Missing key ' + lastKey });
    } else {
        resources[route.resource].create(newResource, function(err, createdResource) {
            if (typeof createdResource === 'undefined') {
                res.status(500).json({message: 'Could not complete request: ' + err});
            } else {
                // TODO(SRLM): Sometimes an error message is returned instead of event. This should be updated.
                res.json(createdResource);
            }
        });
    }
};

exports.update = function(route, req, res, next) {

    var updatedResource = {};

    var id = req.params['id'];
    delete req.params['id']; // Remove so that we don't try to update with the key from the URL

    // Check for the various keys in the upload. Save whataver ones we find.
    underscore.each(resources[route.resource].resource.schema, function(keyDescription, key) {
        if (typeof req.param(key) !== 'undefined') {
            var value = req.param(key);

            // Lazy validation: if we know what type it is, we check to make
            // sure. But we're fine with defaulting to ok.
            if (keyDescription.type === 'uuid') {
                if (validator.isUUID(value) === false) {
                    return;
                }
            } else if (keyDescription.type === 'timestamp') {
                if (validator.isInt(value) === false) {
                    return;
                } else {
                    value = parseInt(value);
                }
            } else if (keyDescription.type === 'object') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    return; // Can't parse the summary statistics.
                }
            }
            updatedResource[key] = value;
        }
    });

    // Now update it.
    if (underscore.isEmpty(updatedResource) === false) {
        resources[route.resource].update(id, updatedResource, function(err, modifiedResource) {
            if (err) {
                res.status(400).json({message: 'Error updating resource: ' + err});
            } else {
                res.json(modifiedResource);
            }
        });
    } else {
        res.status(400).json({message: 'Must submit at least one valid key to update'});
    }
};

exports.delete = function(route, req, res, next) {
    var id = req.param('id');

    resources[route.resource].delete(id, function(err) {
        if (err) {
            res.status(500).json({message: err});
        } else {
            res.json({});
        }
    });
};