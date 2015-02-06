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

/**
 *
 * @param {String} string
 * @returns {Object} JSON representation of whitelisted keys.
 */
function stringToObject(string) {
    return _.reduce(splitString(string), function (memo, f) {

        var field = splitField(f);

        memo[field.key] = _.has(field, 'value') ?
            stringToObject(field.value) : null;

        return memo;
    }, {});
}


/** Search through a sequelize include array and see if we have already included
 * a model. If not, make a new entry.
 *
 * @param {Array} includeArray
 * @param {Object} model
 * @returns {Object} Reference to the include Object.
 */
function getFromIncludeArray(includeArray, model) {
    var result = _.find(includeArray, function (item) {
        return item.model === model;
    });
    if (result) { // We found something, so return it.
        return result;
    } else {

        result = {
            model: model,
            attributes: [],
            include: []
        };
        includeArray.push(result);
        return result;
    }
}

function transformExpand(models, includeArray, expand) {
    _.each(expand, function (expandOption) {
        var expandPath = expandOption.split('.');
        if (_.has(models, expandPath[0])) {
            var t = getFromIncludeArray(includeArray, models[expandPath[0]]);
            if (expandPath.length > 1) {
                // Nested expand. Recurse down a level.
                transformExpand(models, t.include,
                    [expandPath.slice(1).join('.')]);
            }
        }
    });
}

function populateAttributes(models, includeArray, fieldObject) {
    _.each(fieldObject, function(value, key){

    });
}

/**
 *
 * Returns object with the following structure:
 *
 *  attributes: [],
 *  include: [
 *          {
                model: models.dataset,
                attributes: [],
                include: [
                    {
                        model: models.user,
                        attributes: [],
                        include: [...]
                    }
                ]
            }
 ],
 *
 *
 * Field string format:
 *  key: <one of the keys from a full resource>
 *  key with nesting: key[(key+[,key*])
 *
 *  If duplicates exist, the last duplicate takes priority.
 *
 * Error handling for associated resource doesn't exist?
 *
 * Expand is an array of related resources to include in the response.
 * May be nested (ie, for events expand "dataset.user" will expand the dataset
 * and then expand the user in the dataset.
 *
 * In most cases expand should be used in conjunction with fields so that a
 * boatload of data is not returned. It's much faster.
 *
 *
 * @param {Object} models Red9 resource models
 * @param {String} fieldString
 * @param {Array} [expand]
 * @returns {Object}
 */
module.exports = function (models, fieldString, expand) {
    var includeArray = [];
    transformExpand(models, includeArray, expand);

    var fieldObject = stringToObject(fieldString);

    populateAttributes(models, includeArray, fieldObject);

    return {
        attributes: [],
        include: includeArray
    };
};

// Testing exports
module.exports.splitString = splitString;
module.exports.splitField = splitField;
module.exports.stringToObject = stringToObject;
