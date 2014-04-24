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

    var bucketer = Bucketer.new(startTime, endTime, buckets);

    var distributions = [];
    var numberOfSamples = Math.floor((endTime - startTime) / 10); // Hard code 10 milliseconds per sample (100 Hz)

    var fftAxes = [];

    underscore.each(panel.axes, function(axis, index) {
        if (axis.indexOf('acceleration') > -1
                || axis.indexOf('rotationrate') > -1
                || axis.indexOf('magneticfield') > -1
                || axis.indexOf('speed') > -1) {

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
        }
    });

    //var fft = FFT.new(fftAxes, numberOfSamples, 100);


    var fftParameters = {
        axesList: fftAxes,
        inputLength: numberOfSamples,
        sampleRate: 100
    };
    var fftChild = require('child_process').fork('support/datasources/panelprocessors/fftthread', [JSON.stringify(fftParameters)]);


    cassandraPanel.getPanel(panelId, startTime, endTime,
            function(rowTime, rowData, n) {
                underscore.each(distributions, function(distribution) {
                    distribution.processRow(rowTime, rowData);
                });

                //fft.processRow(rowTime, rowData, n);
                fftChild.send({
                    action: 'processRow',
                    time: rowTime,
                    values: rowData,
                    rowIndex: n
                });

                bucketer.processRow(rowTime, rowData);
            },
            function(err) {

                var resultRows = bucketer.processEnd();

                var distributionResults = underscore.reduce(distributions, function(memo, d) {
                    memo.push(d.processEnd());
                    return memo;
                }, []);

                console.log('B');
                //var fftResult = fft.processEnd();
                console.log('C');

                panel.axes.unshift('time');

                fftChild.on('message', function(fftData) {
                    if (underscore.has(fftData, 'columns')) {

                        var result = {
                            labels: panel.axes,
                            startTime: startTime,
                            endTime: endTime,
                            id: panelId,
                            buckets: buckets,
                            values: resultRows,
                            distributions: distributionResults,
                            fft: fftData
                        };

                        callbackDone(err, result);
                    }
                });

                fftChild.send({action: 'processEnd'});
            }
    );

};



/*
 var cacheQuery = 'SELECT body FROM raw_data_cache WHERE id=? AND buckets=? AND start_time=? AND end_time=?';
 var cacheParameters = [
 {
 value: panelId,
 hint: 'uuid'
 },
 {
 value: buckets,
 hint: 'int'
 },
 {
 value: startTime,
 hint: 'timestamp'
 },
 {
 value: endTime,
 hint: 'timestamp'
 }
 ];
 cassandraDatabase.execute(cacheQuery, cacheParameters, function(err, result) {
 if (err) {
 log.error('Error getting panel cache: ' + err + ', ' + err.stack);
 callbackDone('Error getting panel cache: ' + err + ', ' + err.stack);
 return;
 }
 if (typeof result.rows !== 'undefined' && result.rows.length === 1) {
 callbackDone(undefined, result.rows[0].body);
 return;
 }*/