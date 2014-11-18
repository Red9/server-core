"use strict";

var _ = require('underscore')._;
var Boom = require('boom');

var common = require('./resource.common.js');


function isEmbeddedDocument(key) {
    return key.indexOf('.') !== -1;
}


/**
 *
 * @param value
 * @param jsType
 * @param cassandraType
 * @returns {*} if value is null, returns undefined
 */
function convertCassandraTypeToJSType(value, jsType, cassandraType) {
    if (jsType === 'object') {
        if (cassandraType === 'varchar') {
            // Parse only throws errors when it's a string and it has trouble parsing.
            // If it's not a string it just (inconveniently) returns the value.
            if (!_.isString(value) || _.isNull(value)) {
                return {};
            }
            try {
                return JSON.parse(value);
            } catch (e) {
                return {};
            }
        } else { // cassandraType map<***, ***>
            if (_.isNull(value)) {
                return {};
            } else {
                return value;
            }
        }
    }

    if (jsType === 'array') { // cassandraType set<***> or list<***>
        if (_.isNull(value)) {
            return [];
        } else {
            return value;
        }
    }

    if (jsType === 'timestamp') {
        if (_.isDate(value)) {
            return value.getTime();
        } else {
            return value;
        }
    }


    return value;
}

exports.mapToResource = function (mapping, cassandraResource) {
    var result = {};
    _.each(mapping, function (map) {
        if (_.has(cassandraResource, map.cassandraKey)) {
            result[map.jsKey] = convertCassandraTypeToJSType(cassandraResource[map.cassandraKey],
                map.jsType,
                map.cassandraType
            );
        }
    });
    return result;
};


/** Creates a CQL WHERE string.
 *
 * query can contain fields of type
 *
 * Equality:
 * { key  : "value" }
 *
 * In
 * { key : { $in : [ "value1", "value2" ] }
 *
 *
 * @param tableName
 * @param mapping
 * @param query {array} Array of objects (ANDed conditions)
 * @returns {{query: string, parameters: Array, hints: Array}}
 */
exports.constructWhereQueryWithParameters = function (tableName, mapping, query) {
    var result = '';
    var parameters = [];
    var hints = [];

    _.each(query, function (condition) {
        var key = Object.keys(condition)[0];
        var parameter = condition[key];
        if (result !== '') {
            // We have multiple constraints
            result += ' AND ';
        }

        var map = common.getMap(mapping, key);

        if (_.isArray(parameter)) { // Must be before the isObject, since arrays are objects
            throw Boom.badRequest('array parameters are not supported on non command keys');
        } else if (_.isObject(parameter)) {
            // $in condition
            if (Object.keys(parameter).length === 1
                && _.has(parameter, '$in')) {
                // This is a hacky way to get a series of "?,?,?" and array values
                result += map.cassandraKey + ' IN (' + _.reduce(parameter.$in, function (memo, value) {
                    if (memo !== '') { // if not first
                        memo += ',';
                    }
                    memo += '?';
                    parameters.push(common.convertJSTypeToCassandraType(value, map.jsType, map.cassandraType));
                    hints.push(map.cassandraType);
                    return memo;
                }, '') + ')';


            } else {
                throw Boom.badRequest('could not parse parameter ' + JSON.stringify(parameter));
            }

        } else if (_.isString(parameter) || _.isNumber(parameter) || _.isBoolean(parameter)) {
            if (map.cassandraType.indexOf('set') === 0) {
                result += map.cassandraKey + ' CONTAINS ?';
                parameters.push(parameter);

                // Get the "sub" hint
                var startPosition = map.cassandraType.indexOf('<') + 1;
                var endPosition = map.cassandraType.indexOf('>');
                hints.push(map.cassandraType.substring(startPosition, endPosition));
            } else {
                result += map.cassandraKey + '=?';
                parameters.push(parameter);
                hints.push(map.cassandraType);
            }

        } else {
            throw Boom.badRequest('can not parse the parameter for key ' + key);
        }
    });

    if (result !== '') {
        // Only add the WHERE clause if we have something to filter by.
        result = ' WHERE ' + result;
    }

    var queryString = 'SELECT * FROM '
        + tableName + result + ' ALLOW FILTERING';
    return {
        query: queryString,
        parameters: parameters,
        hints: hints
    };
};


/**
 *
 * key/value is assumed to be ANDed with wichever set it goes with (cassandra, local)
 *
 * @param cassandra {array}
 * @param local {object}
 * @param value
 * @param key
 */
function putQueryToHost(cassandra, local, value, key) {
    if (isEmbeddedDocument(key)) {
        // Embedded document
        // We need to test this early in case value is a simple string
        local[key] = value;
    } else if (!_.isObject(value)) {
        // Basic equality test here for simple value
        var t = {};
        t[key] = value;
        cassandra.push(t);
    } else if (_.keys(value).length === 1
        && _.has(value, '$in')) {
        // $in object, which we can do in cassandra
        var k = {};
        k[key] = value;
        cassandra.push(k);
    } else if (key === '$and') {
        _.each(value, function (condition) {
            var conditionKey = Object.keys(condition)[0];
            var conditionValue = condition[conditionKey];

            putQueryToHost(cassandra, local, conditionValue, conditionKey);
        });
    } else if (key === '$or') {
        local[key] = value;
    } else {
        local[key] = value;
    }
}


/** Take a single query object and divide it into query constraints that can be handled
 * in Cassandra, and queries constraints that have to be done locally.
 *
 * @param query {object}
 * @returns {{cassandra: Array, local: Object}} cassandra is an array of AND conditions
 */
exports.divideQueries = function (query) {
    var cassandra = [];
    var local = {};

    _.each(query, function (value, key) {
        putQueryToHost(cassandra, local, value, key);
    });


    var result = {
        cassandra: cassandra,
        local: local
    };
    //console.dir(result);
    return result;
};


/** Tests the simple comparisons between a value and query
 *
 * Examples:
 *
 * value 123, 'def'
 * query: 9999, 'Hello', { $gt: 3 }, { $lt: 123, $ne 99 }
 *
 * @param value The resource value to use
 * @param query A query constraint. Values are tested directly. If it's an object it must have have a single equality comparison key.
 * @returns {boolean} true if query is satisfied, false otherwise.
 */
function testSimpleQuery(value, query) {
    if (_.isObject(query) === false) {
        // then we want to do an equality comparison
        return value === query;
    } else {
        return _.every(query, function (queryValue, queryKey) {
            if (queryKey === '$gt') {
                return value > queryValue;
            } else if (queryKey === '$lt') {
                return value < queryValue;
            } else if (queryKey === '$gte') {
                return value >= queryValue;
            } else if (queryKey === '$lte') {
                return value <= queryValue;
            } else if (queryKey === '$ne') {
                return value !== queryValue;
            } else {// unknown key
                return false;
            }
        });
    }
}


/** Test query against a value.
 *
 *
 *
 * Examples:
 *
 * queryKey: $or
 * queryValue:
 *
 *
 * @todo(SRLM) add in logical operators $or, $and, $not, $nor
 *
 * @param resource {object} The full resource that we need to test
 * @param queryKey {string} the key. Supported keys are $and, $or, and the resource keys themselves (for ===)
 * @param query {object} The query should be an object with keys selected from:
 *                          $gt, $gte, $lt, $lte, $ne.
 *                          The query should be just the constraints. So, something like this:
 *                          {$gt: 53, $lt: 100, $ne: 75}
 *
 *                          $or, $and can have at most one internal condition
 *
 *                          Multiple constraints are ANDed together.
 *
 *                          If the query is not an object then it is tested directly for equality.
 *
 * @returns {boolean} true if resource passes, false otherwise. Defaults to false.
 */
function testQueryPart(resource, queryKey, query) {
    // Is this query multi conditional? (AND, OR)
    if (_.isArray(query)) {

        if (query.length === 0) {
            return false;
        }

        // Multiple constraints are ANDed or ORed together.
        var setupRecursiveCall = function (condition, index) {
            var tempKey = Object.keys(condition)[0];
            var tempValue = condition[tempKey];
            var t = testQueryPart(resource, tempKey, tempValue);
            return t;
        };

        if (queryKey === '$or') {
            return _.any(query, setupRecursiveCall);
        } else if (queryKey === '$and') {
            return _.every(query, setupRecursiveCall);
        } else { // unknown key
            return false;
        }
    } else {
        return testSimpleQuery(extractValue(queryKey, resource), query);
    }
}

/** Parse a key path to get a value from an object
 *
 * @param key {string} a dot separated path
 * @param resource {object} the object from which to extract the value
 * @returns {non-object or array value} Returns the value if found. If not found or
 *      result would not be a simple value then returns undefined. Never returns complex values
 */
function extractValue(key, resource) {
    if (typeof resource === 'undefined') {
        return undefined;
    }

    var path = key.split('.');
    var value = resource[path[0]];

    if (path.length > 1) {
        return extractValue(path.slice(1).join('.'), value);
    } else if (_.isObject(value)) {
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
        return testQueryPart(resource, queryKey, queryParameter);
    });
};