"use strict";

var moment = require('moment');
var underscore = require('underscore')._;
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraPanel = requireFromRoot('support/datasources/cassandra_panel');

var Bucketer = requireFromRoot('support/datasources/panelprocessors/bucketer');
var Distribution = requireFromRoot('support/datasources/panelprocessors/distribution');
var FFT = requireFromRoot('support/datasources/panelprocessors/fft');
var SpectralEntropy = requireFromRoot('support/datasources/panelprocessors/spectralentropy');

var kAccelerationMinimum = -157; // 16 gravities in m/s^2
var kAccelerationMaximum = 157;

var kDistributionSlots = 50;


/** If cache is enabled:
 * - uses if buckets in cache
 * - stores buckets in cache if cache miss
 * 
 * @param {type} panelId
 * @param {type} startTime
 * @param {type} endTime
 * @param {type} buckets
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getPanel = function(parameters, callbackDone) {
    var panelId = parameters.id;
    var startTime = parameters.startTime;
    var endTime = parameters.endTime;
    var buckets = parameters.buckets;
    var panel = parameters.panel;

    var numberOfSamples = Math.floor((endTime - startTime) / 10); // Hard code 10 milliseconds per sample (100 Hz)

    var bucketAxes = [];
    underscore.each(panel.axes, function(axis, index) {
        bucketAxes.push({name: axis, index: index});
    });

    var rowsPerBucket = Math.floor(numberOfSamples / buckets);
    // Make sure we always have at least one row per bucket.
    rowsPerBucket = rowsPerBucket === 0 ? 1 : rowsPerBucket;
    var bucketer = Bucketer.new(bucketAxes, rowsPerBucket);

    var distributions = [];

    var fftAxes = [];

    underscore.each(panel.axes, function(axis, index) {
        if (axis.indexOf('acceleration') > -1
                || axis.indexOf('rotationrate') > -1
                || axis.indexOf('magneticfield') > -1
                || axis.indexOf('speed') > -1) {

            try {
                var t = axis.split(':');
                var axisType = t[0];
                var axisName = t[1];

                var maximum = panel.summaryStatistics.instantaneous[axisType][axisName].maximum.value;
                if (maximum > 0) {
                    maximum *= 1.001;
                } else {
                    maximum *= 0.999;
                }

                var minimum = panel.summaryStatistics.instantaneous[axisType][axisName].minimum.value;
                if (minimum > 0) {
                    minimum *= 0.999;
                } else {
                    minimum *= 1.001;
                }


                if (minimum !== maximum) {
                    // If the minimum and maximum is the same then there is no
                    // distribution. Mostly seen where gps:speed === 0 (no lock).
                    distributions.push(Distribution.new(axis, index,
                            minimum, maximum, kDistributionSlots));

                    fftAxes.push({name: axis, index: index});
                }
            } catch (e) {
                // Do nothing
                // We might catch an error if the particular summary statistic
                // doesn't exist. Which shouldn't be the case, but you never
                // know. See DW-218.
            }
        }
    });

    //var fft = FFT.new(fftAxes, numberOfSamples, 100);
    var se;
    if (numberOfSamples < 15 * 60 * 100) {
        se = SpectralEntropy.new(fftAxes, 256, 100);
    }

    cassandraPanel.getPanel(panelId, startTime, endTime,
            function(rowTime, rowData, n) {
                underscore.each(distributions, function(distribution) {
                    distribution.processRow(rowTime, rowData);
                });

                //fft.processRow(rowTime, rowData, n);
                if (typeof se !== 'undefined') {
                    se.processRow(rowTime, rowData, n);
                }
                bucketer.processRow(rowTime, rowData);
            },
            function(err) {
                var distributionResults = underscore.reduce(distributions, function(memo, d) {
                    memo.push(d.processEnd());
                    return memo;
                }, []);


                var result = {
                    startTime: startTime,
                    endTime: endTime,
                    id: panelId,
                    buckets: buckets,
                    panel: bucketer.processEnd(),
                    distributions: distributionResults,
                    //fft: fft.processEnd()
                    spectralEntropy: typeof se !== 'undefined' ? se.processEnd() : {}
                };
                callbackDone(err, result);
            }
    );
};