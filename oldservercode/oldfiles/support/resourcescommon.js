var underscore = require('underscore')._;
var validator = require('validator');
var moment = require('moment');
var async = require('async');

var geolib = require('geolib');

var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var log = requireFromRoot('support/logger').log;

/**
 * 
 * Constraints are a list of things that fit:
 *  {
 *      path.to.key:[value],
 *      path.to.key2:[value2]
 *  }
 *  
 *  OR
 *  
 *  {
 *      path.to.key:"value,value,value",
 *      path.to.key2: "value"
 *  }
 *  
 *  Note that the path can include .less or .more postfixes. The array of values
 *  are what are compared against. If any of them fail then the entire comparison
 *  fails.
 *  
 * // Compares number to number, if available.
 * // Case insensitive for string comparisons
 * @param {type} object
 * @param {type} constraints
 * @returns {boolean} true if it fits constraints, false otherwise
 */
exports.CheckConstraints = function(object, constraints) {

    var result = true; // Default to true for no constraints.
    underscore.each(constraints, function(constraintValues, constraintPath) {

        // Handle "special" constraints:
        if (constraintPath === 'intersects') {
            result = result && CheckIntersectionConstraint(object, constraintValues);
            return; // Break out of this iteration.
        }


        if (underscore.isString(constraintValues) === true) {
            constraintValues = constraintValues.split(',');
        }
        var path = constraintPath.split('.');


        var comparison = 'equal';
        if (path[path.length - 1] === 'less' || path[path.length - 1] === 'more') {
            comparison = path.pop();
        }
        var objectValue = GetValueFromPath(object, path);

        if (underscore.isString(objectValue) === false
                && underscore.isNumber(objectValue) === false) {
            // Can't compare to complex objects (non-string, non-numerical).
            result = false;
        } else {
            underscore.each(constraintValues, function(constraintValue) {
                result = result && CheckIndividualConstraint(comparison, constraintValue, objectValue);
            });
        }
    });

    return result;
};


function GetNestedKey(targetKey, object) {
    var result;
    for (var key in object) {
        if (targetKey === key) {
            result = object[key];
            break;
        }
        if (underscore.isObject(object[key])) {
            result = GetNestedKey(targetKey, object[key]);
            if (typeof result !== 'undefined') {
                return result;
            }
        }
    }
    return result;
}


function circleIntersectsRectangle(circle, rectangle) {
    // Algorithm from this answer: http://stackoverflow.com/a/402010

    circle.x = Math.abs(circle.x - rectangle.x);
    circle.y = Math.abs(circle.y - rectangle.y);

    if (circle.x > (rectangle.width / 2 + circle.r)) {
        return false;
    }
    if (circle.y > (rectangle.height / 2 + circle.r)) {
        return false;
    }

    if (circle.x <= (rectangle.width / 2)) {
        return true;
    }
    if (circle.y <= (rectangle.height / 2)) {
        return true;
    }

    var cornerDistance_sq = (circle.x - rectangle.width / 2) ^ 2 +
            (circle.y - rectangle.height / 2) ^ 2;

    return (cornerDistance_sq <= (circle.r ^ 2));

}

/**
 * 
 * @param {type} object
 * @param {type} description
 * @returns {Boolean} true if passes constraint, false if it fails
 */
function CheckIntersectionConstraint(object, description) {
    var statistics = GetNestedKey('summaryStatistics', object);
    if (typeof statistics === 'undefined') {
        return false;
    } else {
        try {
            var boundingBox = {
                latitude: {
                    minimum: statistics.instantaneous.gps.latitude.minimum.value,
                    maximum: statistics.instantaneous.gps.latitude.maximum.value
                },
                longitude: {
                    minimum: statistics.instantaneous.gps.longitude.minimum.value,
                    maximum: statistics.instantaneous.gps.longitude.maximum.value
                }
            };

            var boxCenter = geolib.getCenter([
                {longitude: boundingBox.longitude.maximum, latitude: boundingBox.latitude.maximum},
                {longitude: boundingBox.longitude.maximum, latitude: boundingBox.latitude.minimum},
                {longitude: boundingBox.longitude.minimum, latitude: boundingBox.latitude.maximum},
                {longitude: boundingBox.longitude.minimum, latitude: boundingBox.latitude.minimum},
            ]);

            var shape = description.split('(')[0];
            var parameters = description.replace(/^[^(]*\(/, "") // trim everything before first parenthesis
                    .replace(/\)[^(]*$/, "") // trim everything after last parenthesis
                    .split(',');      // split between parenthesis

            parameters = underscore.map(parameters, parseFloat);

            if (shape === 'circle') {
                var result = geolib.isPointInCircle(
                        boxCenter, // Box center
                        {latitude: parameters[0], longitude: parameters[1]}, // Circle center
                parameters[2]); // Radius
                return result;
            }

            return false;

        } catch (e) {
            return false;
        }

    }
}

function CheckIndividualConstraint(comparison, constraintValue, objectValue) {
    var result = false;
    if (comparison === 'less' || comparison === 'more') {
        // If it's not a number but could be convert it.
        if (underscore.isNumber(constraintValue) === false
                && validator.isFloat(constraintValue)) {
            constraintValue = parseFloat(constraintValue);
        }

        if (underscore.isString(objectValue)
                || underscore.isString(constraintValue)) {
            result = false; // Can't compare less/more with strings...
        } else if (comparison === 'less' && objectValue < constraintValue) {
            result = true;
        } else if (comparison === 'more' && objectValue > constraintValue) {
            result = true;
        }

    } else { // equal
        // Test for equality (both directly and as case insensitive strings and as a regex)
        if (constraintValue === objectValue
                || constraintValue.toString().toUpperCase()
                === objectValue.toString().toUpperCase()
                || new RegExp(constraintValue).test(objectValue)) {
            result = true;
        }
    }
    return result;
}

/** Given an array of keys will drill down and get the value from following all
 * those keys.
 * 
 * Low level function.
 *
 * @param {Object} source a JSON object, possibly multiple levels
 * @param {Array} path 
 * @returns {something or undefined} The value at that path.
 */
function GetValueFromPathAndRecurse(source, path) {
    var key = path.shift();
    if (typeof source === 'undefined' || source === null
            || typeof source[key] === 'undefined' || source[key] === null) {
        return;
    } else if (path.length === 0) {
        return source[key];
    } else {
        return GetValueFromPathAndRecurse(source[key], path);
    }
}

/**
 * 
 * @param {type} source
 * @param {Array} path
 * @returns {unresolved|somethingorundefined}
 */
function GetValueFromPath(source, path) {
    // Check the paramater types
    if (underscore.isArray(path) === true
            || path.length > 0
            || underscore.isObject(source) === true) {

        var result = GetValueFromPathAndRecurse(source, path);
        if (underscore.isObject(result) === true
                || underscore.isArray(result) === true) {
            return;
        } else {
            return result;
        }
    } else { // Parameter types invalid
        return;
    }
}



/** Checks if the proposedResource is a valid instance of resource. Must have
 * the exact keys, with the exact value types. Extra keys will cause a result
 * of false, as will values that don't match the schema.
 *  
 * @param {type} resource
 * @param {type} proposedResource
 * @returns {boolean} true if it is a valid resource, false otherwise
 */
function isValidResource(resource, proposedResource) {
    return underscore.every(proposedResource, function(value, key) {
        return isValid(resource, key, value);
    });
}

/** Boilerplate function
 * 
 * @param {type} resource
 * @param {type} callback
 * @returns {undefined}
 */
function emptyPre(resource, callback) {
    callback(true);
}
/** Boilerplate function
 * 
 * @returns {undefined}
 */
function emptyPost() {
}

function emptyFlush() {
}

function emptyOptimizedTest() {
    return false;
}


/** Checks whether a particular value is a valid value for the given key in the given resource.
 * 
 * @param {type} resource
 * @param {type} key
 * @param {type} value
 * @returns {Boolean} true if it is valid, false if it's not.
 */
function isValid(resource, key, value) {
    var type = resource.schema[key].type;
    return validateType(type, value);
}

function validateType(type, value) {
    if (typeof type === 'undefined') {
        return false;
    } else if (type === 'timestamp') {
        return moment(value).isValid();
    } else if (type === 'string') {
        return underscore.isString(value);
    } else if (type === 'uuid') {
        return validator.isUUID(value);
    } else if (type === 'object') {
        return underscore.isObject(value);
    } else if (type === 'integer') {
        return underscore.isNumber(value)
                && validator.isInt(value.toString());
    } else if (type === 'float') {
        return underscore.isNumber(value);
    } else {
        type = type.split(':');
        if (type.length > 1) {
            if (type[0] === 'string' && type[1] === 'email') { // type string:email
                return validator.isEmail(value);
            } else if (type[0] === 'array') {                  // type array:*
                if (underscore.isArray(value) === false) {
                    return false;
                } else {
                    return underscore.every(value, function(string) {
                        return validateType(type[1], string);
                    });
                }
            }
        }
    }
    return false; // Default of not valid.
}



/** This is a general purpose method that will update a given resource.
 * 
 * @param {type} resource
 * @param {type} id
 * @param {type} modifiedResource
 * @param {type} callback (error, modifiedResource)
 * @param {type} forceEditable
 * @returns {undefined}
 */
exports.updateResource = function(resource, id, modifiedResource, callback, forceEditable) {
    var preFunction = typeof resource.update === 'undefined'
            || typeof resource.update.pre === 'undefined' ? emptyPre : resource.update.pre;
    var postFunction = typeof resource.update === 'undefined'
            || typeof resource.update.post === 'undefined' ? emptyPost : resource.update.post;

    if (validator.isUUID(id) === false) {
        callback('Given ID "' + id + '" is not a valid UUID.');
        return;
    }

    //------------------------------------------------------------------
    //TODO(SRLM): Make sure that the resource exists!
    //------------------------------------------------------------------

    exports.getResource(resource, {id: id}, function(resourceList) {
        if (resourceList.length !== 1) {
            callback("resource type '" + resource.name + "' with id='" + id + "' does not exist.");
            return;
        }
        preFunction({id: id, resource: modifiedResource}, function(continueProcessing) {
            if (continueProcessing === false) {
                callback('update.pre failed');
            } else {
                var lastKey = '';
                // Remove invalid keys from resource update
                if (underscore.every(modifiedResource, function(value, key) {
                    lastKey = key;

                    return (forceEditable === true                    // We're forcing editability
                            || resource.schema[key].editable === true) //   or we can edit anyway
                            && key !== 'id'                            // No matter what, can't edit id
                            && isValid(resource, key, value);          // The value is valid
                }) === false) {
                    callback('Resource update validation failed on key "' + lastKey + '"');
                    return;
                }

                var cassandraResource = resource.mapToCassandra(modifiedResource);

                cassandraDatabase.updateSingle(resource.cassandraTable, id, cassandraResource, function(err) {
                    if (err) {
                        log.debug('Error updating resource: ' + err);
                        callback('error');
                    } else {
                        postFunction({id: id, resource: modifiedResource});
                        callback(undefined, modifiedResource);
                    }
                });
            }
        });
    });
};

exports.deleteResource = function(resource, id, callback) {
    var preFunction = typeof resource.delete === 'undefined'
            || typeof resource.delete.pre === 'undefined' ? emptyPre : resource.delete.pre;
    var postFunction = typeof resource.delete === 'undefined'
            || typeof resource.delete.post === 'undefined' ? emptyPost : resource.delete.post;


    preFunction(id, function(continueProcessing) {
        if (continueProcessing === false) {
            callback('create.pre failed.');
        } else {

            if (validator.isUUID(id) === true) {
                cassandraDatabase.deleteSingle(resource.cassandraTable, id, function(err) {
                    postFunction(id);
                    callback(err);
                });
            } else {
                callback('Given id is not version 4 UUID ("' + id + '")');
            }
        }
    });
};

exports.createResource = function(resource, newResource, callback) {

    var preFunction = typeof resource.create === 'undefined'
            || typeof resource.create.pre === 'undefined' ? emptyPre : resource.create.pre;
    var postFunction = typeof resource.create === 'undefined'
            || typeof resource.create.post === 'undefined' ? emptyPost : resource.create.post;
    var flushFunction = typeof resource.create === 'undefined'
            || typeof resource.create.flush === 'undefined' ? emptyFlush : resource.create.flush;
    
    preFunction(newResource, function(continueprocessing) {
        if (continueprocessing === false) {
            callback('create.pre failed.');
        } else {
            if (isValidResource(resource, newResource) === false) {
                callback('Given resource is not valid.');
                return;
            }

            flushFunction(newResource);
            var cassandraResource = resource.mapToCassandra(newResource);

            var table = resource.cassandraTable;
            cassandraDatabase.addSingle(table, cassandraResource, function(err) {
                if (err) {
                    log.error(table + " resource: Error adding. " + err);
                    callback(table + " resource: Error adding. " + err);
                } else {
                    postFunction(newResource);
                    callback(undefined, [newResource]);
                }
            });

        }
    });
};

function expandIndividualResource(expandFunctions, resourceInstance, expand, resourceExpandedCallback) {
    if (typeof expand === 'undefined') {
        resourceExpandedCallback(resourceInstance);
        return;
    }

    async.each(expand,
            function(expandOption, expandCallback) {
                if (typeof expandFunctions[expandOption] !== 'undefined') {
                    expandFunctions[expandOption](resourceInstance, expandCallback);
                } else {
                    expandCallback();
                }
            },
            function(err) {
                resourceExpandedCallback();
            });
}

function processResource(parameters, doneCallback) {
    var resourceDescription = parameters.resourceDescription;
    var resourceInstance = parameters.resourceInstance;
    var expand = parameters.expand;
    var constraints = parameters.constraints;
    var result = parameters.result;

    var expandFunctions = typeof resourceDescription.get === 'undefined'
            || typeof resourceDescription.get.expandFunctions === 'undefined' ? {} : resourceDescription.get.expandFunctions;

    expandIndividualResource(expandFunctions, resourceInstance, expand, function(newDataset) {
        if (exports.CheckConstraints(resourceInstance, constraints) === true) {
            result.push(resourceInstance);
        } else {
            // Resource failed constraints
        }
        doneCallback();
    });
}

exports.getResource = function(resourceDescription, constraints, callback, expand) {
    var preFunction = typeof resourceDescription.get === 'undefined'
            || typeof resourceDescription.get.pre === 'undefined' ? emptyPre : resourceDescription.get.pre;
    var postFunction = typeof resourceDescription.get === 'undefined'
            || typeof resourceDescription.get.post === 'undefined' ? emptyPost : resourceDescription.get.post;
    var optimizedGetTestFunction = typeof resourceDescription.get === 'undefined'
            || typeof resourceDescription.get.optimizedTest === 'undefined' ? emptyOptimizedTest : resourceDescription.get.optimizedTest;

    preFunction(constraints, function(continueProcessing) {
        if (continueProcessing === false) {
            callback('get.pre failed');
            return;
        }

        var result = [];
        var table = resourceDescription.cassandraTable;
        var calculationStartTime = new Date();
        var queue = async.queue(processResource, 10);

        // Error checking variable. Makes sure the we get everything that we push.
        var pushedCount = 0;

        var databaseRowFunction = function(cassandraResource) {
            pushedCount++;
            resourceDescription.mapToResource(cassandraResource, function(resource) {
                var parameters = {
                    resourceDescription: resourceDescription,
                    constraints: constraints,
                    resourceInstance: resource,
                    expand: expand,
                    result: result
                };
                queue.push(parameters);
            });
        };
        var databaseDoneFunction = function(err) {
            queue.drain = function() {
                //log.debug('Resource search (' + table + ') done. Expanded ' + JSON.stringify(expand) + ' and tested ' + underscore.size(constraints) + ' constraints in ' + (new Date() - calculationStartTime) + ' ms');

                postFunction(result);
                callback(result);
            };

            if (pushedCount === 0) {
                callback([]);
            }
        };

        if (underscore.keys(constraints).length === 1
                && underscore.has(constraints, 'id')) { // If we're searching by key do it directly.
            // Get a single resource
            if (validator.isUUID(constraints.id) === true) {
                cassandraDatabase.getSingle(table, constraints.id, function(cassandraResource) {
                    if (typeof cassandraResource !== 'undefined') {
                        databaseRowFunction(cassandraResource);
                        databaseDoneFunction();
                    } else { // ID was not a match
                        callback([]);
                    }
                });
            } else { // UUID is not valid, so we don't have anything.
                callback([]);
            }

        } else if (optimizedGetTestFunction(constraints) === true) {
            resourceDescription.get.optimizedGet(constraints,
                    databaseRowFunction,
                    databaseDoneFunction);
        } else {
            cassandraDatabase.getAll(table,
                    databaseRowFunction,
                    databaseDoneFunction);
        }
    });
};

