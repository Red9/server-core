'use strict';

var _ = require('lodash');

module.exports = function (value, digits) {
    return _.isNumber(value) ?
        value.toFixed(digits) :
        value;
};
