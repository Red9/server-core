"use strict";

var underscore = require('underscore')._;

// // Taken from:
// http://newcome.wordpress.com/2009/11/04/simple-fourier-transform-in-javascript/

//function fourier(in_array) {
//    var len = in_array.length;
//    var output = new Array();
//
//    for (var k = 0; k < len; k++) {
//        var real = 0;
//        var imag = 0;
//        for (var n = 0; n < len; n++) {
//            real += in_array[n] * Math.cos(-2 * Math.PI * k * n / len);
//            imag += in_array[n] * Math.sin(-2 * Math.PI * k * n / len);
//        }
//        output.push([real, imag])
//    }
//    return output;
//}

function log10(val) {
    return Math.log(val) / Math.LN10;
}

function constructFFTArray(numAxes, fftLength) {
    var fft = [];
    for (var i = 0; i < fftLength; i++) {
        fft.push([]); // Push row
        for (var j = 0; j < numAxes; j++) {
            fft[i].push([0, 0]); // Push initial value for column
        }
    }
    return fft;
}

/**
 * 
 * @param {type} axesList list of {name:"", index:i} objects.
 * @param {type} inputLength
 * @param {type} sampleRate
 * @returns {exports.new.Anonym$5}
 */
exports.new = function(axesList, inputLength, sampleRate) {

    console.log('Input Length: ' + inputLength);

    var fftLength = 1000;
    var inputDivider = 8;

    // First index is the FFT row
    // Second index is the axes (column)
    // Third index is column value (real, imaginary)
    var fft = constructFFTArray(axesList.length, fftLength);

    function FFTToInputIndex(index) {
        return Math.floor(index * inputLength / inputDivider / fftLength);
    }
    function inputToFFTIndex(index) {
        return Math.floor(index / (inputLength / inputDivider) * fftLength);
    }
    function FFTIndexToFrequency(index) {
        return FFTToInputIndex(index) * sampleRate / inputLength;
    }

    function processRow(time, values, rowIndex) {

        for (var inputIndex = 0; inputIndex < inputLength / inputDivider; inputIndex++) {
            // Manually "inline" function for better performance
            //var binIndex = inputToFFTIndex(inputIndex);
            var fftIndex = Math.floor(inputIndex / (inputLength / inputDivider) * fftLength);

            var t = -2 * Math.PI * rowIndex * inputIndex / inputLength;
            var cosT = Math.cos(t);
            var sinT = Math.sin(t);

            // Iterate over columns
            for (var axesIndex = 0; axesIndex < axesList.length; axesIndex++) {
                var valueIndex = axesList[axesIndex].index;
                var value = values[valueIndex];
                fft[fftIndex][axesIndex][0] += value * cosT;
                fft[fftIndex][axesIndex][1] += value * sinT;
            }
        }
    }

    function processEnd() {
        var index;

        // Initialize the count
        var fftBinCount = [];
        for (index = 0; index < fftLength; index++) {
            fftBinCount.push(0);
        }

        // Figure out how many samples got compressed into each bin
        for (index = 0; index < inputLength; index++) {
            var fftIndex = inputToFFTIndex(index);
            fftBinCount[fftIndex]++;
        }
        
        var fftColumns = {
            frequency:[]
        };
        underscore.each(axesList, function(axis){
           fftColumns[axis.name] = []; 
        });
        
        underscore.each(fft, function(row, fftIndex){
            var binCount = fftBinCount[fftIndex];
            if (binCount > 0) { // Only keep bins with at least 1 value added in.
                underscore.each(axesList, function(axis, columnIndex){
                    // Average each point
                    var real = row[columnIndex][0] / binCount;
                    var imaginary = row[columnIndex][1] / binCount;

                    var amplitude = Math.sqrt(real * real + imaginary * imaginary);
                    
                    fftColumns[axis.name].push(amplitude);
                });

                var frequency = FFTIndexToFrequency(fftIndex);
                fftColumns.frequency.push(frequency);
            }
        });

        return {
            sampleRate: sampleRate,
            columns: fftColumns
        };
    }

    return {
        processRow: processRow,
        processEnd: processEnd
    };
};