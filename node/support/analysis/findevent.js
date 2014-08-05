var _ = require('underscore')._;
var spawn = require('child_process').spawn;
var async = require('async');


var log = requireFromRoot('support/logger').log;
var datasetResource = requireFromRoot('support/resources/dataset');
var eventResource = requireFromRoot('support/resources/event');
var panelResource = requireFromRoot('support/resources/panel');

var sockets = requireFromRoot('action/socketroutes/socketmanager');
var useful = requireFromRoot('support/useful');

exports.random = function(datasetId, eventType, quantity) {
    var broadcastId = 'random' + useful.generateInt(0, 999);

    var minimumDuration = 1000;
    var maximumDuration = 20000;

    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }

        var dataset = datasetList[0];

        for (var i = 0; i < quantity; i++) {
            var duration = useful.generateInt(minimumDuration, maximumDuration);
            var startTime = useful.generateInt(dataset.headPanel.startTime,
                    dataset.headPanel.endTime - duration);

            var event = {
                datasetId: datasetId,
                type: eventType,
                startTime: startTime,
                endTime: startTime + duration,
                source: {
                    type: 'auto',
                    algorithm: 'random',
                    parameters: {
                        quantity: quantity,
                        minimumDuration: minimumDuration,
                        maximumDuration: maximumDuration
                    }
                }
            };

            eventResource.create(event, function(err) {
                if (err) {
                    log.error('Could not create event: ' + err);
                }
            });
        }

        sockets.broadcastStatus(broadcastId, '--- Randomly found ' + quantity + ' events ---');

    }, ['headPanel']);
};


function createListener(lineCallback) {
    var updateBuffer = '';
    return function(something) {
        updateBuffer += something;

        if (updateBuffer.split('\n').length > 1) {
            var t = updateBuffer.split('\n');
            updateBuffer = t[t.length - 1]; // Keep last bit in case it's not an entire line.

            for (var i = 0; i < t.length - 1; i++) {
                lineCallback(t[i]);
            }
        }
    };
}


exports.session = function(datasetId, options) {
    var broadcastId = 'session' + useful.generateInt(0, 999);
    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }
        var dataset = datasetList[0];

        var start = new Date().getTime();
        var script = spawn('Rscript', ['main.r'], {cwd: 'bin/eventfinder/'});
        script.stdout.setEncoding('utf8');
        script.stderr.setEncoding('utf8');
        script.stdin.setEncoding('utf8');

        // Read this as we go along so that the user can get live updates.
        var updateListener = createListener(function(line) {
            sockets.broadcastStatus(broadcastId, line);
        });
        script.stderr.on('data', updateListener);

        // clone so we have an "original" copy for our source storage.
        var storedOptions = _.clone(options);

        script.on('exit', function(code, signal) {

            // Let's make sure to log the error code
            if (code !== 0) {
                var errorMessage = 'Non zero code! ' + code + '(' + signal + ')';
                log.error(errorMessage);
                sockets.broadcastStatus(broadcastId, errorMessage);
            }

            // Let's see if we can get more info. Reading stderr might lead to ECONNRESET, so beware.
            var processingInfo = script.stderr.read();
            if (code !== 0) {
                var errorMessage = 'Non zero code! ' + code + '(' + signal + '): ' + processingInfo;
                log.error(errorMessage);
                sockets.broadcastStatus(broadcastId, errorMessage);
                return;
            }

            // Clean up the last bit of output (or output blank line).
            updateListener('\n');

            // Record the amount of time for execution
            var executionSeconds = ((new Date().getTime()) - start) / 1000;
            sockets.broadcastStatus(broadcastId, 'Execution time: ' + executionSeconds + ' seconds');

            // The found events
            var output = JSON.parse(script.stdout.read());
            var events = output.results;

            // Let the user know.
            sockets.broadcastStatus(broadcastId, '--- Found ' + events.length + ' events ---');
            sockets.broadcastStatus(broadcastId, 'Calculating summary statistics for detected events.');
            sockets.broadcastStatus(broadcastId, 'Please give it a minute and then refresh the page to see your new events.');

            // Now we need to actually store all the events.
            _.each(events, function(event) {
                event.datasetId = datasetId;
                event.source = {
                    type: 'auto',
                    algorithm: 'eventdetection',
                    parameters: storedOptions
                };

                eventResource.create(event, function(err) {
                    if (err) {
                        log.error('Could not create event: ' + err);
                    }
                });
            });

        });

        var rowsOutput = 0;
        // We've set everything up, so now we need to stream the panel to the script.
        panelResource.getPanelBody({
            id: dataset.headPanelId
        }, function(panel) {
            var axisList = _.reduce(panel.axes, function(memo, column, index) {
                return memo + ',' + column;
            }, 'time');

            sockets.broadcastStatus(broadcastId, 'Need to load ' + panel.rowCount + ' rows of data.');
            script.stdin.write(JSON.stringify({
                rowCount: panel.rowCount
            }) + '\n');

            script.stdin.write(axisList + '\n');
        }, function(time, data, index) {
            var row = _.reduce(data, function(memo, value) {
                return memo + ',' + value;
            }, time);
            script.stdin.write(row + '\n');
            rowsOutput++;
        }, function(err) {
            var t = JSON.stringify(options) + '\n'
                    + JSON.stringify({
                        command: 'exit'
                    }) + '\n';
            script.stdin.write(t);
        });
    });
};

exports.spectral = function(options) {
    var broadcastId = 'spectral' + useful.generateInt(0, 999);
    var datasetId = options.datasetId;

    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }
        var dataset = datasetList[0];

        var start = new Date().getTime();
        var script = spawn('Rscript', ['spectralThreshold.r'], {cwd: 'bin/spectralentropy/'});
        script.stdout.setEncoding('utf8');
        script.stderr.setEncoding('utf8');
        script.stdin.setEncoding('utf8');

        // Read this as we go along so that the user can get live updates.
        var updateBuffer = '';
        script.stderr.on('data', function(something) {
            updateBuffer += something;

            while (updateBuffer.split('\n', 2).length > 1) {
                var t = updateBuffer.split('\n');
                updateBuffer = t[1];
                sockets.broadcastStatus(broadcastId, t[0]);
            }
        });

        // clone so we have an "original" copy for our source storage.
        var storedOptions = _.clone(options);

        script.on('exit', function(code, signal) {

            // Let's make sure to log the error code
            if (code !== 0) {
                var errorMessage = 'Non zero code! ' + code + '(' + signal + ')';
                log.error(errorMessage);
                sockets.broadcastStatus(broadcastId, errorMessage);
            }

            // Let's see if we can get more info. Reading stderr might lead to ECONNRESET, so beware.
            var processingInfo = script.stderr.read();
            if (code !== 0) {
                var errorMessage = 'Non zero code! ' + code + '(' + signal + '): ' + processingInfo;
                log.error(errorMessage);
                sockets.broadcastStatus(broadcastId, errorMessage);
                return;
            }

            // Clean up the last bit of output.
            if (updateBuffer !== '') {
                sockets.broadcastStatus(broadcastId, updateBuffer);
            }

            // Record the amount of time for execution
            var executionSeconds = ((new Date().getTime()) - start) / 1000;
            sockets.broadcastStatus(broadcastId, 'Execution time: ' + executionSeconds + ' seconds');

            // The found events
            var events = JSON.parse(script.stdout.read());

            // Let the user know.
            sockets.broadcastStatus(broadcastId, '--- Found ' + events.length + ' events ---');
            sockets.broadcastStatus(broadcastId, 'Calculating summary statistics for detected events.');
            sockets.broadcastStatus(broadcastId, 'Please give it a minute and then refresh the page to see your new events.');

            // Now we need to actually store all the events.
            _.each(events, function(event) {
                event.type = options.eventType;
                event.datasetId = options.datasetId;
                event.source = {
                    type: 'auto',
                    algorithm: 'spectralThreshold',
                    parameters: storedOptions
                };
                eventResource.create(event, function(err) {
                    if (err) {
                        log.error('Could not create event: ' + err);
                    }
                });
            });

        });

        // We've set everything up, so now we need to stream the panel to the script.
        var axisIndex = -1;
        panelResource.getPanelBody({
            id: dataset.headPanelId
        }, function(panel) {
            axisIndex = _.reduce(panel.axes, function(memo, column, index) {
                if (column === options.axis) {
                    return index;
                } else {
                    return memo;
                }
            });

            options.rowCount = panel.rowCount;
            script.stdin.write(JSON.stringify(options) + '\n');

            script.stdin.write('time,dataaxis\n');
        }, function(time, data, index) {
            var output = time + ',' + data[axisIndex];
            script.stdin.write(output + '\n');
        }, function(err) {
            script.stdin.write('\n\n');
        });



    });

};
