"use strict";

var underscore = require('underscore')._;
var log = requireFromRoot('support/logger').log;

// Throws away, at most, rowsPerBucket -1 input rows of data.
exports.new = function(axes, rowsPerBucket) {

    var time = [];
    var output = [];
    var workingRow = [];
    underscore.each(axes, function() {
        output.push([]);
        workingRow.push(0);
    });

    var counter = 0;
    var workingTime = 0;
    function processRow(rowTime, rowData) {
        for (var columnIndex = 0; columnIndex < axes.length; columnIndex++) {
            workingRow[columnIndex] += rowData[axes[columnIndex].index];
        }
        if (counter === 0) {
            workingTime = rowTime;
        }

        counter++;

        if (counter === rowsPerBucket) {
            for (var columnIndex = 0; columnIndex < workingRow.length; columnIndex++) {
                var value = workingRow[columnIndex];
                output[columnIndex].push(value / rowsPerBucket);
                workingRow[columnIndex] = 0; // Reset for next round                
            }
            time.push(workingTime);
            counter = 0;
        }
    }
    function processEnd() {
        var result = {};
        underscore.each(axes, function(axis, index) {
            result[axis.name] = output[index];
        });

        result.time = time;

        return result;
    }

    return {
        processRow: processRow,
        processEnd: processEnd
    };
};