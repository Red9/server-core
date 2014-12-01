"use strict";

module.exports = function (value, digits, newUnits) {
    if (newUnits === 'ft') {
        value *= 3.28084;
    } else if(newUnits === 'mph'){
        value *= 2.23694
    }

    return value.toFixed(digits);
};