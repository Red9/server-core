
var _ = require('underscore')._;
var kCommandCharacter = '$';
var assert = require('assert');

var logger = require('./logger');


function valueToCassandraString(type, value) {
    if (_.isObject(value) === true) {
        logger.error('Cannot pass an object type to this function.');
        return '';
    } else if (_.isArray(value) === true) {
        logger.error('Cannot pass an array type to this function.');
        return '';
    }

    if (type === 'varchar' && _.isString(value)) {
        // Cassandra escapes single quotes with an extra single quote
        return "'" + value.replace(/'/g, "''") + "'";
    } else if ((type === 'int' || type === 'float' || type === 'double') && _.isNumber(value)) {
        return '' + value;
    } else if (type === 'uuid' && _.isString(value)) {
        return '' + value;
    }
}

exports.constructWhereQuery = function(query) {
    _.each(query, function(parameters, key) {
        if (key.charAt(0) === kCommandCharacter) {
            // Do nothing for now.
        } else {
            if (_.isArray(parameters) || _.isObject(parameters)) {

            } else if (_.isString(parameters)) {

            }
        }
    });



    return '';
};




// Testing exports
exports.valueToCassandraString = valueToCassandraString;