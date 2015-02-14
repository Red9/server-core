'use strict';

var _ = require('lodash');
var Boom = require('boom');

function splitString(string) {
    var result = [];
    var working = '';
    var stackSize = 0;

    _.each(string, function (char) {
        if (char === ',' && stackSize === 0) {
            result.push(working);
            working = '';
        } else {
            if (char === '(') {
                stackSize++;
            } else if (char === ')') {
                stackSize--;
            }
            working += char;
        }
    });

    result.push(working);

    if (stackSize !== 0) {
        throw Boom.badRequest('Unbalanced parens in string');
    }
    return result;
}

/**
 *
 * @param {String} string
 * @returns {Object}
 */
function splitField(string) {
    if (string[string.length - 1] !== ')') {
        // No nested fields (assumption)
        return {
            key: string
        };
    }

    var t = string.slice(0, -1).split('(');

    return {
        key: t[0],
        value: t.slice(1).join('(')
    };
}

function stringToObject(string) {
    return _.reduce(splitString(string), function (memo, f) {

        var field = splitField(f);

        memo[field.key] = _.has(field, 'value') ?
            stringToObject(field.value) : null;

        return memo;
    }, {});
}

module.exports = function (fieldString) {

};

// Testing exports
module.exports.splitString = splitString;
module.exports.splitField = splitField;
module.exports.stringToObject = stringToObject;
