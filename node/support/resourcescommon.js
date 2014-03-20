var underscore = require('underscore')._;
var validator = require('validator');
var moment = require('moment');
var async = require('async');

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
        if(constraintPath === 'intersects'){
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


function GetNestedKey(targetKey, object){
    var result;
    for(var key in object){
        if(targetKey === key){
            result = object[key];
            break;
        }
        if(underscore.isObject(object[key])){
            result = GetNestedKey(targetKey, object[key]);
            if(typeof result !== 'undefined'){
                return result;
            }
        }
    }
    return result;
}

function CheckIntersectionConstraint(object, description){
    var statistics = GetNestedKey('summaryStatistics', object);
    if(typeof statistics === 'undefined'){
        return false;
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


/**
 * 
 * @param {type} value
 * @param {type} type
 * @returns {Boolean} True if value matches type
 */
exports.checkType = function(value, type) {
    if (type === 'timestamp') {
        return moment(value).isValid();
    } else if (type === 'string' || type === 'varchar') {
        return underscore.isString(value);
    } else if (type === 'uuid') {
        return validator.isUUID(value);
    } else if (type === 'resource:summary_statistics') {
        //TODO(SRLM): Make this more robust
        return underscore.isObject(value);
    } else if (type === 'integer') {
        return underscore.isNumber(value)
                && validator.isInt(value.toString());
    } else if (type === 'float') {
        return underscore.isNumber(value);
    } else {
        return false;
    }
};

/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
exports.generateUUID = function() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return (_p8() + _p8(true) + _p8(true) + _p8());
}



exports.checkNewResourceAgainstSchema = function(resourceSchema, proposedResource) {
    // Check if we have the correct set of keys
    var correctKeys = true;
    underscore.each(resourceSchema, function(value, key) {
        correctKeys = correctKeys && (key in proposedResource) === value.includeToCreate;
    });

    if (correctKeys === false) {
        return "Incorrect keys given.";
    }

    // Check for the correct value types
    var correctTypes = true;
    underscore.each(proposedResource, function(value, key) {
        correctTypes = correctTypes && exports.checkType(value, resourceSchema[key].type);
    });
    if (correctTypes === false) {
        return "Incorrect types given";
    }
};


function emptyPre(resource, callback) {
    callback(true);
}
function emptyPost() {
}



exports.updateResource = function(resource, id, modifiedResource, callback, forceEditable) {
    var preFunction = typeof resource.update === 'undefined'
            || typeof resource.update.pre === 'undefined' ? emptyPre : resource.update.pre;
    var postFunction = typeof resource.update === 'undefined'
            || typeof resource.update.post === 'undefined' ? emptyPost : resource.update.post;

    //------------------------------------------------------------------
    //TODO(SRLM): Make sure that the resource exists!
    //------------------------------------------------------------------

    preFunction({id: id, resource: modifiedResource}, function(continueProcessing) {
        if (continueProcessing === false) {
            callback('update.pre failed');
        } else {

            if (typeof id === 'undefined' || validator.isUUID(id) === false) {
                callback('Must include valid ID');
                return;
            }

            underscore.each(modifiedResource, function(value, key) {
                if (key in resource.schema === false
                        || (resource.schema[key].editable === false
                                && forceEditable !== true)
                        || key === 'id') {
                    delete modifiedResource[key];
                }
            });

            if (modifiedResource.length === 0) {
                callback('Must include at least one editable item');
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


    preFunction(newResource, function(continueprocessing) {
        if (continueprocessing === false) {
            callback('create.pre failed.');
        } else {
            var valid = exports.checkNewResourceAgainstSchema(resource.schema, newResource);
            if (typeof valid !== 'undefined') {
                callback('Schema failed: ' + valid);
                return;
            }

            resource.create.flush(newResource);
            var cassandraResource = resource.mapToCassandra(newResource);

            var table = resource.cassandraTable;
            cassandraDatabase.addSingle(table, cassandraResource, function(err) {
                if (err) {
                    log.error(table + " resource: Error adding. " + err);
                    callback(table + " resource: Error adding. " + err);
                } else {
                    log.debug("successfully created in table " + table);
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


    preFunction(constraints, function(continueProcessing) {
        if (continueProcessing === false) {
            callback('get.pre failed');
            return;
        }

        //TODO(SRLM): Add check: if just a single resource (given by ID) then do a direct search for that.

        var calculationStartTime = new Date();

        var result = [];
        var queue = async.queue(processResource, 0);

        var table = resourceDescription.cassandraTable;
        cassandraDatabase.getAll(table,
                function(cassandraResource) {
                    var resource = resourceDescription.mapToResource(cassandraResource);

                    var parameters = {
                        resourceDescription: resourceDescription,
                        constraints: constraints,
                        resourceInstance: resource,
                        expand: expand,
                        result: result
                    };
                    queue.push(parameters);

                },
                function(err) {
                    queue.drain = function() {
                        //log.debug('Resource search (' + table + ') done. Expanded ' + JSON.stringify(expand) + ' and tested ' + underscore.size(constraints) + ' constraints in ' + (new Date() - calculationStartTime) + ' ms');

                        postFunction(result);
                        callback(result);
                    };

                    // Turn on the queue
                    queue.concurrency = 5;
                });
    });
};

