var underscore = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('recalculateSS', '0');
var log = logger.log;

var panelResource = requireFromRoot('support/resources/panel');
var cassandraPanel = requireFromRoot('support/datasources/cassandra_panel');

var panelId = '57a1ee7e-2267-fa50-358f-0d3e03f3936d';
var testRepeatCount = 10;

var concurrencyLimitList = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30];
var durationLimitList = [5000, 10000, 25000, 50000, 60000, 70000, 80000, 90000, 100000, 150000];

//var concurrencyLimitList = [1, 2];
//var durationLimitList = [500, 1000];

var bestRun = {
    average: 99999999999  // very high default;  
};

function findMedian(results) {
    if (results.length % 2 === 1) { // Odd length
        return results[Math.floor(results.length / 2)];
    } else { // Event length
        return (results[Math.floor(results.length / 2)] + results[Math.floor(results.length / 2) - 1]) / 2;
    }
}

function findAverage(results) {
    return underscore.reduce(results, function(memo, num) {
        return memo += num;
    }, 0) / results.length;
}

function processResults(results, durationLimit, concurrencyLimit) {
    results = underscore.sortBy(results, function(num) {
        return num;
    });

    console.log(concurrencyLimit
            + ', ' + durationLimit
            + ', ' + findAverage(results).toFixed(3)
            + ', ' + findMedian(results).toFixed(3)
            + ', ' + underscore.min(results).toFixed(3)
            + ', ' + underscore.max(results).toFixed(3)
            );

    return findAverage(results);
}

function runTest(panelId, startTime, endTime, durationLimit, concurrencyLimit,
        callback) {
    var start = new Date().getTime();
    cassandraPanel.getPanel(panelId, startTime, endTime,
            function() { // Row function

            },
            function() { // Done function
                var duration = ((new Date().getTime()) - start) / 1000; // convert to seconds
                callback(undefined, duration);
            }, durationLimit, concurrencyLimit);
}

function runTests(panelId, startTime, endTime, durationLimit, concurrencyLimit, callback) {
    async.timesSeries(testRepeatCount, function(n, next) {
        runTest(panelId, startTime, endTime, durationLimit, concurrencyLimit, next);
    }, function(err, results) {
        var average = processResults(results, durationLimit, concurrencyLimit);
        if (average < bestRun.average) {
            bestRun.average = average;
            bestRun.concurrencyLimit = concurrencyLimit;
            bestRun.durationLimit = durationLimit;
        }
        callback();
    });
}



function allDone() {
    console.log('************************************');
    console.log('Best run: ' + bestRun.concurrencyLimit + ', '
            + bestRun.durationLimit + ', average ' + bestRun.average);

    console.log('Done!');
    process.exit();
}



panelResource.get({id: panelId}, function(panelList) {
    var panel = panelList[0];

    console.log('concurrencyLimit, durationLimit, average, median, min, max');
    async.eachSeries(concurrencyLimitList,
            function(concurrencyLimit, callbackConcurrency) {
                async.eachSeries(durationLimitList,
                        function(durationLimit, callbackDuration) {
                            runTests(panel.id, panel.startTime, panel.endTime,
                                    durationLimit, concurrencyLimit, callbackDuration);
                        },
                        function() {
                            callbackConcurrency();
                        });
            },
            allDone);
});


