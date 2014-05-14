var _ = require('underscore')._;
var spawn = require('child_process').spawn;
var async = require('async');


var log = requireFromRoot('support/logger').log;
var datasetResource = requireFromRoot('support/resources/dataset');
var eventResource = requireFromRoot('support/resources/event');
var panelResource = requireFromRoot('support/resources/panel');

var sockets = requireFromRoot('action/socketroutes/socketmanager');

// Returns a random integer between min and max
// Using Math.round() will give you a non-uniform distribution!
// Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.random = function(datasetId, eventType, quantity) {
    var broadcastId = 'random' + getRandomInt(0, 999);

    var minimumDuration = 1000;
    var maximumDuration = 20000;

    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }

        var dataset = datasetList[0];

        for (var i = 0; i < quantity; i++) {
            var duration = getRandomInt(minimumDuration, maximumDuration);
            var startTime = getRandomInt(dataset.headPanel.startTime,
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
    var broadcastId = 'spectral' + getRandomInt(0, 999);
    var datasetId = options.datasetId;

    datasetResource.get({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            log.error('Invalid dataset id: ' + datasetId);
            return;
        }
        var dataset = datasetList[0];

        var start = new Date().getTime();
        var script = spawn('Rscript', ['spectralWave.r'], {cwd: 'bin/hmm/'});
        script.stdout.setEncoding('utf8');
        script.stderr.setEncoding('utf8');
        script.stdin.setEncoding('utf8');

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
            if (updateBuffer !== '') {
                sockets.broadcastStatus(broadcastId, updateBuffer);
            }
            var executionSeconds = ((new Date().getTime()) - start) / 1000;
            sockets.broadcastStatus(broadcastId, 'Execution time: ' + executionSeconds + ' seconds');

            var processingInfo = script.stderr.read();
            var events = JSON.parse(script.stdout.read());

            if (code !== 0) {
                var errorMessage = 'Non zero code! ' + code + ': ' + processingInfo;
                log.error(errorMessage);
                sockets.broadcastStatus(broadcastId, errorMessage);
                return;
            }

            sockets.broadcastStatus(broadcastId, '--- Found ' + events.length + ' events ---');
            sockets.broadcastStatus(broadcastId, 'Calculating summary statistics for detected events.');

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