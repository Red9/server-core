"use strict";

var underscore = require('underscore')._;
var log = requireFromRoot('support/logger').log;


/** Create a distribution based on the input rows.
 * 
 * @param {type} name       A name for this distribution.
 * @param {type} valueIndex The index in the row array that the histogram values should be taken from.
 * @param {type} minimum    The minimum value that the input is expected to be.
 * @param {type} maximum    The maximum value that the input is expected to be.
 * @param {type} slots      The number of buckets to fit the distribution into. Has all the tradeoffs that a traditional histogram has.
 * @returns {object} with two functions:
 *                        processRow(time, values) time is ignored, values is the array of values at that time. valueIndex selects from this array.
 *                        proccessEnd() Returns the final distribution.
 */
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
        // Sometimes one of the values is a NaN. While not a good thing (it
        // probably indicates a problem in the underlaying data processing) we
        // shouldn't have a problem ignoring it at this level.
        if(underscore.isNaN(values[valueIndex])){
            return;
        }
        
        var index = (values[valueIndex] - minimum) / (maximum - minimum) * (slots - 1);
        index = Math.floor(index);
        if (underscore.isNaN(values[valueIndex])) {
            log.debug('values[valueIndex]: ' + values[valueIndex] + ', index: ' + index + ', slots: ' + slots + ', time: ' + time);
        }

        if (underscore.isNaN(index) || index < 0 || index >= slots) {
            log.error('Wrong index: ' + index + ', value: ' + values[valueIndex] + ', time: ' + time);
        } else {
            distribution[index].count += 1;
        }
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