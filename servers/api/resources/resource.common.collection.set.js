"use strict";

var _ = require('underscore');
var cassandra = require('./cassandra');
var common = require('./resource.common.js');

function createUpdateQuery(tableName, id, operation, cassandraKey, cassandraType, values) {
    var operator = '';
    if (operation === 'add') {
        operator = '+';
    } else { // (operation === 'remove')
        operator = '-';
    }

    var query = 'UPDATE ' + tableName + ' SET '
        + cassandraKey + ' = ' + cassandraKey + ' ' + operator + " {'"
        + values.join("','") + "'} WHERE id=" + id;

    return {
        query: query,
        parameters: [],
        hints: []
    };
}

function genericOperation(resourceDescription, id, operation, jsKey, values, callback) {
    var map = common.getMap(resourceDescription.mapping, jsKey);
    var cassandraOptions = createUpdateQuery(resourceDescription.tableName, id, operation, map.cassandraKey, map.cassandraType, values);

    cassandra.execute({
        query: cassandraOptions.query,
        parameters: cassandraOptions.parameters,
        hints: cassandraOptions.hints,
        callback: callback
    });
}

exports.add = function (resourceDescription, id, jsKey, values, callback) {
    genericOperation(resourceDescription, id, 'add', jsKey, values, callback);
};

exports.remove = function (resourceDescription, id, jsKey, values, callback) {
    genericOperation(resourceDescription, id, 'remove', jsKey, values, callback);
};