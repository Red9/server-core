"use strict";

module.exports = function (value, digits, newUnits) {
    if (newUnits === 'ft') {
        value *= 3.28084; // meters to feet
    } else if(newUnits === 'mph'){
        value *= 1.15078; // knots to mph
    }

    return value.toFixed(digits);
};