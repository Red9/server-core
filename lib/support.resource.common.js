var _ = require('underscore')._;
var assert = require('assert');
var logger = require('./support.logger');

function valueToCassandraString(value) {
    if (_.isObject(value) === true) {
        logger.error('Cannot pass an object type to this function.');
        return '';
    } else if (_.isArray(value) === true) {
        logger.error('Cannot pass an array type to this function.');
        return '';
    }

    if (_.isString(value)
        && /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}/.test(value)) {
        // If it's a UUID then we don't escape it with quotes
        // Regex taken from http://stackoverflow.com/a/14166194/2557842
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
    if(_.isObject(query) === false){
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






function createOrderBy(next, parameters){
    return {
        process: function(resource){

        },
        done: function(){
            next.done();
        }
    }
}

function createSkipAndLimit(next, parameters){
    return {
        process: function(resource){

        },
        done: function(){
            next.done();
        }
    }
}

function createExpand(next, parameters){
    return {
        process: function(resource){

        },
        done: function(){
            next.done();
        }
    }
}












// Testing exports
exports.valueToCassandraString = valueToCassandraString;
exports.testQueryOnValue = testQueryOnValue;
exports.extractValue = extractValue;