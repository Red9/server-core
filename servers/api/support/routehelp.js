"use strict";

var _ = require('underscore')._;

function filterFields(fields, resource) {
    if (fields === '*') {
        return resource;
    } else {
        var result = {};
        _.each(fields, function (accept, key) {
            if (accept === '*') {
                result[key] = resource[key];
            } else if (_.has(resource, key)) {
                if (_.isArray(resource[key])) {
                    result[key] = _.map(resource[key],
                        function (item, index) {
                            return filterFields(accept, item);
                        });
                } else {
                    result[key] = filterFields(accept, resource[key]);
                }
            }
        });
        return result;
    }
}
exports.filterFields = filterFields;

/** Interpret just one "field" value.
 *
 * Possible interpretations are:
 * straight key
 * object with sub keys ex. abc(key1,key2)
 *
 *
 * @param fields {Object}
 * @param field {String}
 */
function processField(fields, field) {
    if (field.indexOf('(') !== -1) {
        var key = '';
        var value = '';
        var lfparenStackHeight = 0;
        var done = false;
        _.each(field, function (lfLetter) {
            if ((lfLetter === ')' && lfparenStackHeight === 1) || done) {
                // Done
                done = true;
            } else if (lfLetter === '(' && lfparenStackHeight === 0) {
                lfparenStackHeight++;
            } else if (lfparenStackHeight === 0) {
                key += lfLetter;
            } else {
                value += lfLetter;
            }
        });

        // If it's a glob then we'll take everything.
        if (value === '*') {
            fields[key] = '*';
        } else {
            fields[key] = seperateCSV(value);
        }

    } else {
        fields[field] = '*';
    }

}

function seperateCSV(string) {
    var fields = {};
    var lastField = '';
    var parenStackHeight = 0;
    _.each(string, function (letter) {
        if (letter === '(') {
            parenStackHeight++;
        } else if (letter === ')') {
            parenStackHeight--;
        }
        if (letter === ',' && parenStackHeight === 0) {
            processField(fields, lastField);
            lastField = '';
        } else {
            lastField += letter;
        }
    });
    processField(fields, lastField);
    return fields;
}


exports.getFieldsFromQuery = function (query) {

    if (_.isUndefined(query.fields) || query.fields === '') {
        return '*';
    } else {
        var fields = '*';
        if (query.fields !== '*') {
            fields = seperateCSV(query.fields);
        }
        delete query.fields;
        return fields;
    }
};