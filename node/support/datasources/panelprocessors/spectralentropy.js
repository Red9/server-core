// Fourier Taken from:
// http://newcome.wordpress.com/2009/11/04/simple-fourier-transform-in-javascript/


var underscore = require('underscore')._;

function processWindow(resultNames, resultIndicies, window, windowTime, sampleRate, columnArray) {
    var windowLength = window.length;

    // Iteratate over frequencies
    for (var fIndex = 0; fIndex < windowLength / 8; fIndex++) {
        
        // Setup a place to store each columns values
        var intermediate = [];
        for(var t = 0; t < resultIndicies.length; t++){
            intermediate.push([0,0]);
        }
        
        // Construct frequency from each value in window
        // Iterate over window
        for (var windowIndex = 0; windowIndex < windowLength; windowIndex++) {
            var t = -2 * Math.PI * fIndex * windowIndex / windowLength;
            var cosT = Math.cos(t);
            var sinT = Math.sin(t);

            // Append to each column's values
            for(var columnIndex = 0; columnIndex < resultIndicies.length; columnIndex++){
                var valueIndex = resultIndicies[columnIndex];
                intermediate[columnIndex][0] += window[windowIndex][valueIndex] * cosT;
                intermediate[columnIndex][1] += window[windowIndex][valueIndex] * sinT;
            }
        }
        
        // At this point one frequency has been calculated. Next, "append" that
        // one frequency (for each of the result axes) to the result.
        
        var frequency = fIndex * sampleRate / windowLength;
        
        for(var t = 0; t < intermediate.length; t++){
            var real = intermediate[t][0];
            var imaginary = intermediate[t][1];
            var magnitude = Math.sqrt(real * real + imaginary * imaginary);
            columnArray[resultNames[t]].push([windowTime, frequency, magnitude]);
        }
    }
}


exports.new = function(axesList, windowSize, sampleRate) {

    var result = {};
    
    underscore.each(axesList, function(axis){
       result[axis.name] = []; 
    });
    

    var currentWindow = [];
    var currentWindowTime = 0;



    var resultNames = underscore.pluck(axesList, 'name');
    var resultIndicies = underscore.pluck(axesList, 'index');

    function processRow(time, values, rowIndex) {

        if (currentWindow.length === windowSize) {
            processWindow(resultNames, resultIndicies, currentWindow, currentWindowTime, sampleRate, result);
            currentWindow = [];
        }

        if (currentWindow.length === 0) {
            currentWindowTime = time;
        }
        currentWindow.push(values);
    }

    function processEnd() {
        return result;
    }

    return {
        processRow: processRow,
        processEnd: processEnd
    };
};


///*
//function processWindow(resultIndicies, window, sampleRate) {
//    var windowLength = window.length;
//    var output = [];
//
//    // Iteratate over frequencies
//    for (var k = 0; k < windowLength / 8; k++) {
//        var working = [];
//
//        // Create one pair for each of the result columns
//        underscore.each(resultIndicies, function() {
//            working.push([0, 0]);
//        });
//
//
//        // Construct frequency from each value in window
//        for (var n = 0; n < windowLength; n++) {
//            var t = -2 * Math.PI * k * n / windowLength;
//            var cosT = Math.cos(t);
//            var sinT = Math.sin(t);
//
//            // Construct each column's value
//            underscore.each(resultIndicies, function(valueIndex, workingIndex) {
//                working[workingIndex][0] += window[n][valueIndex] * cosT;
//                working[workingIndex][1] += window[n][valueIndex] * sinT;
//            });
//        }
//
//        // For each output column calculate and store the magnitude
//        var row = [];
//        
//        //console.log('working: ' + working);
//        underscore.each(working, function(tempColumnValues) {
//            var real = tempColumnValues[0];
//            var imaginary = tempColumnValues[1];
//            var magnitude = Math.sqrt(real * real + imaginary * imaginary);
//            row.push(magnitude);
//        });
//
//        // Store the current
//        output.push({
//            frequency: k * sampleRate / windowLength,
//            values: row
//        });
//    }
//    return output;
//}*/