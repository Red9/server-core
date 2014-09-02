var _ = require('underscore')._;
var async = require('async');
var assert = require('assert');
var logger = require('./support.logger');

var moment = require('moment');
var validator = require('validator');

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
};



function valueToCassandraString(value) {
    if (_.isObject(value) === true) {
        logger.error('Cannot pass an object type to this function.');
        return '';
    } else if (_.isArray(value) === true) {
        logger.error('Cannot pass an array type to this function.');
        return '';
    }

    if (_.isString(value)
        && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/.test(value)) {
        // If it's a UUID then we don't escape it with quotes
        // Regex taken from http://stackoverflow.com/a/14166194/2557842
        // Note we must check to make sure it's _only_ a UUID, and not part of a sentence
        return '' + value;
    }
    else if (_.isString(value)) {
        // Cassandra escapes single quotes with an extra single quote
        return "'" + value.replace(/'/g, "''") + "'";
    } else if (_.isNumber(value)) {
        return '' + value;
    } else {

    }
}

// Assumes that query is correctly formatted!
exports.constructWhereQuery = function (query) {
    var result = '';

    _.each(query, function (parameter, key) {
        if (result !== '') {
            // We have multiple constraints
            result += ' AND ';
        }

        if (_.isObject(parameter)) {
            // $in condition
            if (Object.keys(parameter).length === 1
                && _.has(parameter, '$in')) {
                result += key + ' IN ('
                    + _.map(parameter.$in, valueToCassandraString).join(', ')
                    + ')';
            } else {
                logger.error('could not parse parameter ' + JSON.stringify(parameter));
            }

        } else if (_.isArray(parameter)) {
            logger.error('array parameters are not supported on non command keys');
        } else if (_.isString(parameter) || _.isNumber(parameter) || _.isBoolean(parameter)) {
            result += key + ' = ' + valueToCassandraString(parameter);
        } else {
            logger.error('can not parse the parameter for key ' + key);
        }
    });

    if (result !== '') {
        // Only add the WHERE clause if we have something to filter by.
        result = ' WHERE ' + result;
    }

    return result;
};

/** Changes the keys according to the map.
 *
 * Useful for when the Cassandra table has different keys than the JSON schema.
 *
 * @param {object} query the query to adjust the names for
 * @param {object} map the map from JS schema to cassandra schema key names
 * @returns {object} modified object with mapped keys
 */
exports.mapQueryKeyName = function (query, map) {
    return _.reduce(query, function (memo, value, key) {
        if (_.has(map, key)) {
            memo[map[key]] = value;
        } else {
            memo[key] = value;
        }
        return memo;
    }, {});
};


exports.divideQueries = function (query) {
    var cassandra = {};
    var local = {};

    _.each(query, function (value, key) {
        if (isEmbeddedDocument(key)) {
            // Embedded document
            // We need to test this early in case it's value is a simple string
            local[key] = value;
        } else if (_.isString(value) || _.isNumber(value)) {
            // Basic equality test here
            cassandra[key] = value;
        } else if (_.isObject(value)
            && _.keys(value).length === 1
            && _.has(value, '$in')) {
            // $in object, which we can do in cassandra
            cassandra[key] = value;
        } else {
            local[key] = value;
        }
    });

    return {
        cassandra: cassandra,
        local: local
    };
};


/** Test query against a value.
 *
 * @param value {number or string} The value to compare against.
 * @param query {object} The query should be an object with keys selected from:
 *                          $gt, $gte, $lt, $lte, $ne.
 *                          The query should be just the constraints. So, something like this:
 *                          {$gt: 53, $lt: 100, $ne: 75}
 *
 *                          Multiple constraints are ANDed together.
 *
 *                          If the query is not an object then it is tested directly for equality.
 *
 * @returns {boolean} true if resource passes, false otherwise. Defaults to false.
 */
function testQueryOnValue(value, query) {
    if (_.isObject(query) === false) {
        // then we want to do an equality comparison
        return value === query;
    }

    // At this point we know the query is a more complex object, and we're
    // doing a non-equality comparison
    if (query.length > 1) {
        // Multiple constraints are ANDed together.
        return _.all(query, function (qpv, qpk) {
            // Construct an artificial query with just a single condition, and test that.
            var artificialQuery = {};
            artificialQuery[qpk] = qpv;
            return testQueryOnValue(value, artificialQuery);
        });
    }
    // else testing a single condition

    if (_.has(query, '$gt')) {
        return value > query.$gt;
    } else if (_.has(query, '$lt')) {
        return value < query.$lt;
    } else if (_.has(query, '$gte')) {
        return value >= query.$gte;
    } else if (_.has(query, '$lte')) {
        return value <= query.$lte;
    } else if (_.has(query, '$ne')) {
        return value !== query.$ne;
    } else {
        return false;
    }
}

function isEmbeddedDocument(key) {
    return key.indexOf('.') !== -1;
}

/**
 *
 * @param key {string} a dot separated path
 * @param resource {object} the object from which to extract the value
 * @returns {non-object or array value} Returns the value if found. If not found or result would not be a simple value then returns undefined.
 */
function extractValue(key, resource) {
    if (typeof resource === 'undefined') {
        return undefined;
    }

    var path = key.split('.');
    var value = resource[path[0]];

    if (path.length > 1) {
        return extractValue(path.slice(1).join('.'), value);
    } else if (_.isArray(value) || _.isObject(value)) {
        // Must be after recursive test.
        return undefined;
    } else {
        return value;
    }
}

/** This tests "local" query constraint against a resource. Tested constraints are:
 *
 * @todo(SRLM) equality for array element [NOT IMPLEMENTED]
 * @todo(SRLM) add in $in, $nin operators (mostly useful for arrays and embedded documents)
 * @todo(SRLM) add in logical operators $or, $and, $not, $nor
 *
 * embedded document comparison (must be of the format "nested.keys.are.dot.separated" and not as nested objects)
 * comparison operators ([equal], $gt, $gte, $lt, $lte, $ne)
 *
 * @param resource the resource to test against
 * @param query {object} the mongoDB style query. Empty {} for no query.
 * @returns {boolean} true if the document satisfies the query, false otherwise
 */
exports.testAgainstQuery = function (resource, query) {
    return _.all(query, function (queryParameter, queryKey) {
        return testQueryOnValue(extractValue(queryKey, resource), queryParameter);
    });
};


// -------------------------------------------------------------------------
// Pipeline components
// -------------------------------------------------------------------------
/** Create an ordering object.
 *
 * @param parameters {object} mongoDB style order by: {key: 1} (ascending) or {key2: -1} (descending) or {key3: 0} (no orderBy)
 * @param next {function} (resource) the next stage to call with a resource
 * @returns {{newRow: newRow, done: done}} two functions: call newRow with each row of data, and done when done.
 */
function setupOrderBy(parameters, next) {
    // Get rid of the "no" orderBy parameters (0):
    parameters = _.reduce(parameters, function (memo, value, key) {
        if (value !== 0) {
            memo[key] = value;
        }
        return memo;
    }, {});


    // If we're ordering we'll store the items here for eventual sorting.
    var list = [];

    // We're ordering if the orderBy parameters have exactly one key
    var amOrdering = _.keys(parameters).length === 1;
    if (_.keys(parameters).length > 1) {
        logger.error('Too many orderBy keys. Defaulting to no orderBy.');
        amOrdering = false;
    }

    var sortingKey;
    if (amOrdering) {
        sortingKey = _.keys(parameters)[0];
    }

    function sortingFunction(e) {
        // Multiply to get the correct sorting direction.
        return e[sortingKey] * parameters[sortingKey];
    }

    return {
        newRow: function (e) {
            if (amOrdering) {
                list.push(e);
            } else {
                next(e);

            }
        },
        done: function () {
            if (amOrdering) {
                _.chain(list)
                    .sortBy(sortingFunction)
                    .each(function (e) {
                        next(e);
                    });
            }
            // If we're not orderBy-ing then we don't have to do anything at the end:
            // we've already sent the results
        }
    };
}

/**
 *
 * @param $skip
 * @param $limit Limit the response to this number of items. Set to undefined or 0
 * @param postQueue
 * @returns {Function}
 */
function setupSkipAndLimit($skip, $limit, postQueue) {

    if (typeof $skip === 'undefined'
        || $skip === null
        || _.isNumber($skip) === false
        || $skip < 0) {
        $skip = 0;
    }

    if (typeof $limit === 'undefined'
        || $skip === null
        || _.isNumber === false
        || $limit <= 0) {
        $limit = Number.MAX_VALUE;
    }

    return function (e) {
        if ($skip > 0) {
            $skip--;
        } else if ($limit <= 0) {
            // do nothing
        } else {
            $limit--;
            postQueue.push(e);
        }
    };
}


exports.queryTailPipeline = function (extraParameters, expandFunction, rowCallback, doneCallback) {
    var expandQueue = async.queue(function (resource, callback) {
        //expand resource;
        expandFunction(extraParameters.$expand, resource, function (expandedResource) {
            rowCallback(expandedResource);
            callback();
        });
    }, 1);

    var skipAndLimit = setupSkipAndLimit(extraParameters.$skip, extraParameters.$limit, expandQueue);
    var orderBy = setupOrderBy(extraParameters.$orderBy, skipAndLimit);

    return {
        row: function (row) {
            orderBy.newRow(row);
        },
        done: function () {
            orderBy.done();
            if (expandQueue.idle()) {
                doneCallback();
            } else {
                expandQueue.drain = doneCallback;
            }
        }
    };
};

// -------------------------------------------------------------------------
// Create Resource
// -------------------------------------------------------------------------

exports.createResourceString = function (tableName, mappedResource) {
    var t = _.reduce(mappedResource, function (memo, value, key) {
        if (memo.keys !== '') { // if not first
            memo.keys += ',';
            memo.values += ',';
        }

        memo.keys += key;
        memo.values += valueToCassandraString(value);

        return memo;
    }, {keys: '', values: ''});


    var query = 'INSERT INTO ' + tableName + ' (' + t.keys + ') VALUES (' + t.values + ')';
    return query;
};

function validateType(type, value) {
    if (typeof type === 'undefined' || typeof value === 'undefined') {
        return false;
    } else if (type === 'timestamp') {
        return _.isNumber(value) && moment(value).isValid();
    } else if (type === 'string') {
        return _.isString(value);
    } else if (type === 'uuid') {
        return validator.isUUID(value);
    } else if (type === 'object') {
        return _.isArray(value) === false && _.isObject(value);
    } else if (type === 'integer') {
        return _.isNumber(value)
            && validator.isInt(value.toString());
    } else if (type === 'float') {
        return _.isNumber(value);
    } else {
        type = type.split(':');
        if (type.length > 1) {
            if (type[0] === 'string' && type[1] === 'email') { // type string:email
                return validator.isEmail(value);
            } else if (type[0] === 'array') {                  // type array:*
                if (_.isArray(value) === false) {
                    return false;
                } else {
                    return _.every(value, function(string) {
                        return validateType(type[1], string);
                    });
                }
            }
        }
    }
    return false; // Default of not valid.
}

exports.checkNewResource = function (schema, resource) {
    // Make sure that the schema is correctly represented in the resource
    var inclusiveTest = _.reduce(schema, function (memo, parameters, key) {
        if (memo !== null) {
            // pass through
        } else if (parameters.includeToCreate === true) {
            if (_.has(resource, key) === false) {
                memo = 'Must include key ' + key + ' to create.';
            } else if (validateType(parameters.type, resource[key]) === false) {
                memo = 'Value for key ' + key + ' is not valid.';
            }
        } else if (parameters.includeToCreate === false
            && _.has(resource, key)) {
            memo = 'Must not include key ' + key + ' to create.';
        }

        return memo;
    }, null);

    if(inclusiveTest){
        return inclusiveTest;
    }

    // Make sure that the resource does not have extra keys
    var extraTest = _.reduce(resource, function(memo, value, key){
        if(memo !== null){
            // pass through
        }else if(_.has(schema, key) === false){
            memo = 'Must not include extra key ' + key + ' to create.';
        }
        return memo;
    }, null);

    return extraTest;
};


// Testing exports
exports.valueToCassandraString = valueToCassandraString;
exports.testQueryOnValue = testQueryOnValue;
exports.extractValue = extractValue;
exports.setupSkipAndLimit = setupSkipAndLimit;
exports.setupOrderBy = setupOrderBy;
exports.validateType = validateType;