"use strict";

var underscore = require('underscore')._;
var log = requireFromRoot('support/logger').log;

exports.new = function(name, valueIndex, minimum, maximum, slots) {
    var distribution = [];

    var slotSize = (maximum - minimum) / slots;
    for (var i = 0; i < slots; i++) {
        distribution.push({
            minimum: minimum + slotSize * i,
            maximum: minimum + slotSize * (i + 1),
            count: 0
        });
    }

    function processRow(time, values) {
        var index = (values[valueIndex] - minimum) / (maximum - minimum) * (slots - 1);
        index = Math.floor(index);
        if (underscore.isNaN(values[valueIndex])) {
            console.log('values[valueIndex]: ' + values[valueIndex] + ', index: ' + index + ', slots: ' + slots);
        }

        if (underscore.isNaN(index) || index < 0 || index >= slots) {
            log.error('Wrong index: ' + index + ', value: ' + values[valueIndex]);
        }
        distribution[index].count += 1;
    }


    function processEnd() {
        return {
            name: name,
            minimum: minimum,
            maximum: maximum,
            distribution: distribution
        };
    }

    return {
        processRow: processRow,
        processEnd: processEnd
    };
};