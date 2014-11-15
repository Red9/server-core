"use strict";

var _ = require('underscore')._;
var async = require('async');

/**
 * Generates a GUID string, according to RFC4122 standards.
 *
 * Modified by SRLM to generate a version 4 UUID.
 *
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
exports.generateUUID = function () {
    function _p8() {
        return (Math.random().toString(16) + "000000000").substr(2, 8);
    }

    var setB = _p8();
    var setC = _p8();

    var t = ['8', '9', 'a', 'b'];
    var single = t[Math.floor(Math.random() * t.length)];

    return _p8() + '-' + setB.substr(0, 4) + '-4' + setB.substr(4, 3) + '-'
        + single + setC.substr(0, 3) + '-' + setC.substr(4, 4) + _p8();
};

function convertJSTypeToCassandraType(value, jsType, cassandraType) {
    if (_.isObject(value) && cassandraType === 'varchar') {
        // isObject gets both arrays and objects
        return JSON.stringify(value);
    } else {
        return value;
    }
}
exports.convertJSTypeToCassandraType = convertJSTypeToCassandraType;


/** Searches through the map array for for the entry that matches the given key.
 *
 * @param mapping {array}
 * @param jsKey {string}
 * @returns {object} Map entry
 */
exports.getMap = function(mapping, jsKey) {
    return _.find(mapping, function (value) {
        return value.jsKey === jsKey;
    });
};

/*//////////////////////////////////////////////////////////////////////////////

 CREATE, UPDATE, DELETE operations

 //////////////////////////////////////////////////////////////////////////////*/

/**
 *
 * @param tableName
 * @param mapping
 * @param newResource (may be missing keys, but it gets the Cassandra default)
 * @returns {{query: *, parameters: *, hints: *}}
 */
exports.createResourceQuery = function (tableName, mapping, newResource) {
    var result = _.reduce(mapping, function (memo, map, index) {
            if (_.has(newResource, map.jsKey)) {
                if (memo.keys !== '') { // if not first
                    memo.keys += ',';
                    memo.parameterPlaceholders += ',';
                }

                memo.keys += map.cassandraKey;
                memo.parameterPlaceholders += '?';
                memo.parameters.push(convertJSTypeToCassandraType(newResource[map.jsKey], map.jsType, map.cassandraType));
                memo.hints.push(map.cassandraType);
            }
            return memo;
        },
        {
            keys: '',
            parameterPlaceholders: '',
            parameters: [],
            hints: []
        }
    );
    result.query = 'INSERT INTO ' + tableName + ' (' + result.keys + ') VALUES (' + result.parameterPlaceholders + ')';


    return {
        query: result.query,
        parameters: result.parameters,
        hints: result.hints
    };
};


/**
 *
 * @param tableName
 * @param mapping
 * @param id
 * @param updatedResource
 * @returns {{query: *, parameters: *, hints: *}}
 */
exports.createUpdateQuery = function (tableName, mapping, id, updatedResource) {
    var result = _.reduce(mapping, function (memo, map, index) {
            if (_.has(updatedResource, map.jsKey)) {
                if (memo.assignments !== '') { // if not first
                    memo.assignments += ',';
                }

                memo.assignments += map.cassandraKey + '=?';
                memo.parameters.push(convertJSTypeToCassandraType(updatedResource[map.jsKey], map.jsType, map.cassandraType));
                memo.hints.push(map.cassandraType);
            }
            return memo;
        },
        {
            assignments: '',
            parameters: [],
            hints: []
        }
    );
    result.query = 'UPDATE ' + tableName + ' SET ' + result.assignments + ' WHERE id=' + id;

    return {
        query: result.query,
        parameters: result.parameters,
        hints: result.hints
    };
};

exports.createDeleteQuery = function (tableName, id) {
    return 'DELETE FROM ' + tableName + ' WHERE id = ' + id;
};