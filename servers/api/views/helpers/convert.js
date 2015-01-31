'use strict';

var _ = require('lodash');

module.exports = function (value, digits, newUnits) {
    if (_.isNumber(value)) {
        if (newUnits === 'ft') {
            value *= 3.28084; // meters to feet
        } else if (newUnits === 'mph') {
            value *= 1.15078; // knots to mph
        }

        return value.toFixed(digits);
    } else {
        return value;
    }
};
