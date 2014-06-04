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


exports.spectral = function(options) {
    var broadcastId = 'spectral' + useful.generateInt(0, 999);
    var datasetId = options.datasetId;

    log.info('Starting SE script with options: ' + JSON.stringify(options));

    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }
        var dataset = datasetList[0];

        var start = new Date().getTime();
        var script = spawn('Rscript', ['spectralThreshold.r'], {cwd: 'bin/hmm/'});
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