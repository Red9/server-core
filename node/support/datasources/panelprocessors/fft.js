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
        //var fftOutput = [];
        var index;

        // Take the average of all the bins

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





//exports.new = function(name, valueIndex, inputLength, sampleRate) {
//    console.log('Input Length: ' + inputLength);
//
//    var fftLength = 1000;
//    var inputDivider = 8;
//    
//    
//    
//
//    var fft = [];
//    
//    
//    for (var i = 0; i < fftLength; i++) {
//        fft.push([0, 0]);
//    }
//    
//    function FFTToInputIndex(index){
//        return Math.floor(index * inputLength / inputDivider / fftLength);
//    }
//    function inputToFFTIndex(index){
//        return Math.floor(index / (inputLength / inputDivider) * fftLength);
//    }
//    function FFTIndexToFrequency(index){
//        return FFTToInputIndex(index) * sampleRate / inputLength;
//    }
//
//    function processRow(time, values, rowIndex) {
//        var value = values[valueIndex];
//        for (var inputIndex = 0; inputIndex < inputLength / inputDivider; inputIndex++) {
//            // Manually "inline" function for better performance
//            //var binIndex = inputToFFTIndex(inputIndex);
//            var binIndex = Math.floor(inputIndex / (inputLength / inputDivider) * fftLength);
//
//            var t = -2 * Math.PI * rowIndex * inputIndex / inputLength;
//            fft[binIndex][0] += value * Math.cos(t);
//            fft[binIndex][1] += value * Math.sin(t);
//        }
//    }
//
//    function processEnd() {
//        //var fftOutput = [];
//        var index;
//
//        // Take the average of all the bins
//
//        // Initialize the count
//        var fftBinCount = [];
//        for (index = 0; index < fftLength; index++) {
//            fftBinCount.push(0);
//        }
//
//        // Figure out how many samples got compressed into each bin
//        for (index = 0; index < inputLength; index++) {
//            var binIndex = inputToFFTIndex(index);
//            fftBinCount[binIndex]++;
//        }
//
//        // Calculculate the final output
//        var fftOutput = underscore.reduce(fft, function(memo, point, fftIndex) {
//            var binCount = fftBinCount[fftIndex];
//            if (binCount > 0) { // Throw away bins without any values added in.
//                // Average each point
//                var real = point[0] / binCount;
//                var imaginary = point[1] / binCount;
//
//                var amplitude = Math.sqrt(real * real + imaginary * imaginary);
//                
//                var frequency = FFTIndexToFrequency(fftIndex);
//
//                memo.push({
//                    x: frequency,
//                    y: amplitude
//                });
//            }
//            return memo;
//        }, []);
//
//        return {
//            name: name,
//            sampleRate: sampleRate,
//            points: fftOutput
//        };
//    }
//
//    return {
//        processRow: processRow,
//        processEnd: processEnd
//    };
//};

//exports.new = function(name, valueIndex, inputLength, samplingFrequency) {
//
//    var scratchpadLength = 500;
//    
//    
//
//    var scratchpad = [];
//    for (var i = 0; i < inputLength / 8; i++) { // Only do first half and first half of that (Nyquist)
//        scratchpad.push([0, 0]);
//    }
//
//    function processRow(time, values, rowIndex) {
//        for(var outputIndex = 0; outputIndex < scratchpad.length; outputIndex++){
//            scratchpad[outputIndex][0] += values[valueIndex] * Math.cos(-2 * Math.PI * rowIndex * outputIndex / inputLength);
//            scratchpad[outputIndex][1] += values[valueIndex] * Math.sin(-2 * Math.PI * rowIndex * outputIndex / inputLength);
//        }
//        
//    }
//
//    function processEnd() {
//        
//        console.log('scratchpad length: ' + scratchpad.length);
//        
//        // power spectral density:
//        // 20 * log10(sqrt(real^2 + imaginary^2) ) using first N/2
//        var finalOutput = [];
//        underscore.each(scratchpad, function(point) {
//            var real = point[0];
//            var imaginary = point[1];
//            var value = Math.sqrt(real * real + imaginary * imaginary);
//            finalOutput.push(value);
//        });
//
//        return {
//            name: name,
//            samplingFrequency: samplingFrequency,
//            points: finalOutput
//        };
//    }
//
//
//    return {
//        processRow: processRow,
//        processEnd: processEnd
//    };
//};


