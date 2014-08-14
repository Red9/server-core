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

function startSession(datasetId, readyCallback) {
    var broadcastId = 'sessionScript' + useful.generateInt(0, 999);
    var script = spawn('Rscript', ['main.r'], {cwd: 'bin/eventfinder/'});
    script.stdout.setEncoding('utf8');
    script.stderr.setEncoding('utf8');
    script.stdin.setEncoding('utf8');

    // Set up listeners for the script outputs.
    // STDERR is user facing messages (what's happening)
    // STDOUT is the result (one line of results for each line of commands).
    var resultOutput = function() {
    };

    var stderrListener = useful.createStreamToLine(function(line) {
        sockets.broadcastStatus(broadcastId, line);
    });

    var stdoutListener = useful.createStreamToLine(function(line) {
        resultOutput(JSON.parse(line));
    });

    script.stderr.on('data', stderrListener);
    script.stdout.on('data', stdoutListener);


    var shutdownPeriod = 1000 * 60 * 60 * 1; // 1 hours
    var shutdownTimer;

    script.on('exit', function(code, signal) {
        log.info('Script ' + datasetId + ' has exited.');
        // Make sure that nobody else tries to use this.
        delete sessionList[datasetId];

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
        stderrListener('\n');
        sockets.broadcastStatus(broadcastId, 'Script has been killed. Exiting now.');
    });

    var rowsOutput = 0;
    // We've set everything up, so now we need to stream the panel to the script.
    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }
        var dataset = datasetList[0];
        var keepIndicies = [];
        var ignoreList = [
            'gps:altitude',
            'gps:satellite',
            'gps:hdop',
            'gps:magneticvariation',
            //'pressure:pressure',
            'pressure:temperature'
        ];
        panelResource.getPanelBody({
            id: dataset.headPanelId
        }, function(panel) {
            // Output the number of rows so that the script can prepare
            sockets.broadcastStatus(broadcastId, 'Need to load ' + panel.rowCount + ' rows of data.');
            script.stdin.write(JSON.stringify({
                rowCount: panel.rowCount
            }) + '\n');

            // Output the axes (column titles) as a CSV list
            var axisList = _.reduce(panel.axes, function(memo, column, index) {
                if (_.indexOf(ignoreList, column) !== -1) {
                    keepIndicies.push(false);
                    return memo;
                } else {
                    keepIndicies.push(true);
                    return memo + ',' + column;
                }
            }, 'time');
            script.stdin.write(axisList + '\n');
        }, function(time, data, index) {
            // Output the data row as a CSV.
            var row = _.reduce(data, function(memo, value, index) {
                if (keepIndicies[index] === true) {
                    return memo + ',' + value;
                } else {
                    return memo;
                }
            }, time);
            script.stdin.write(row + '\n');
            rowsOutput++;
        }, function(err) {
            shutdownTimer = setTimeout(shutdown, shutdownPeriod);
            readyCallback();
        });
    });

    function sendCommand(options, resultCallback) {
        clearTimeout(shutdownTimer);

        // If the script exits now that means it has crashed during processing,
        // which we don't want but must accomodate by not leaving our listerener
        // hanging.
        var exitFunction = function() {
            resultCallback('Premature exit: script crash.');
        };
        script.on('exit', exitFunction);

        resultOutput = function(result) {
            resultCallback(undefined, result);
            script.removeListener('exit', exitFunction);
            shutdownTimer = setTimeout(shutdown, shutdownPeriod);
        };

        script.stdin.write(JSON.stringify(options) + '\n');
    }
    function shutdown() {
        log.info('Shutting down script for dataset ' + datasetId);
        var t = JSON.stringify({
            command: 'exit'
        }) + '\n';
        script.stdin.write(t);
    }

    return {
        sendCommand: sendCommand,
        shutdown: shutdown
    };
}

var maximumSessions = 2;
var sessionList = {};

function getSession(datasetId, callback) {
    if (_.has(sessionList, datasetId)) {
        // Update the access time to now
        sessionList[datasetId].time = (new Date()).getTime();
        callback(sessionList[datasetId].session);
    } else {
        // Need to create a new session
        var createdSession = startSession(datasetId,
                function() {
                    sessionList[datasetId] = {
                        session: createdSession,
                        time: (new Date()).getTime()
                    }
                    callback(createdSession);

                    // And trim the size of the list.
                    while (_.size(sessionList) > maximumSessions) {
                        var oldestDataset = _.reduce(sessionList,
                                function(memo, current, datasetId) {
                                    console.log('datasetId: ' + datasetId + ', memo: ' + JSON.stringify(memo));
                                    if (typeof memo === 'undefined'
                                            || current.time < sessionList[memo].time) {
                                        return datasetId;
                                    } else {
                                        return memo;
                                    }
                                }, undefined);
                        log.info('sessionList too big: removing oldest dataset (' + oldestDataset + ')');
                        sessionList[oldestDataset].session.shutdown();
                        delete sessionList[oldestDataset];
                    }
                });
    }
}

function runOption(datasetId, options, session) {
    var broadcastId = 'session' + useful.generateInt(0, 999);
    sockets.broadcastStatus(broadcastId, 'Starting command "' + options.command + '"');
    session.sendCommand(options,
            function(err, result) {
                if (err) {
                    sockets.broadcastStatus('Error: ' + err);
                    return;
                }
                // The found events

                var events = result.results;

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
                        parameters: options
                    };

                    eventResource.create(event, function(err) {
                        if (err) {
                            log.error('Could not create event: ' + err);
                        }
                    });
                });
            }
    );
}

exports.session = function(datasetId, options) {
    getSession(datasetId, function(session) {
        runOption(datasetId, options, session);
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
