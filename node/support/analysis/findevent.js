var _ = require('underscore')._;
var spawn = require('child_process').spawn;
var async = require('async');


var log = requireFromRoot('support/logger').log;
var datasetResource = requireFromRoot('support/resources/dataset');
var eventResource = requireFromRoot('support/resources/event');
var panelResource = requireFromRoot('support/resources/panel');


// Returns a random integer between min and max
// Using Math.round() will give you a non-uniform distribution!
// Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.random = function(datasetId, eventType, quantity) {

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
    }, ['headPanel']);
};


exports.spectral = function(options) {
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

        script.stderr.on('data', function(something) {
            console.log('M: ' + something.trim());
        });

        script.on('exit', function(code, signal) {
            console.log('Execution time: ' + ((new Date().getTime()) - start));

            var processingInfo = script.stderr.read();
            var events = JSON.parse(script.stdout.read());

            if (code !== 0) {
                log.error('Non zero code! ' + code + ': ' + processingInfo);
            }

            console.log('Events: ' + JSON.stringify(events));

            _.each(events, function(event) {

                event.type = options.eventType;
                event.datasetId = options.datasetId;
                event.source = {
                    type: 'auto',
                    algorithm: 'spectralThreshold',
                    parameters: options
                };

                eventResource.create(event, function(err) {
                    if (err) {
                        log.error('Could not create event: ' + err);
                    }
                });
            });

        });

        script.stdin.write(JSON.stringify(options) + '\n');
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


            script.stdin.write('time,dataaxis\n');
        }, function(time, data, index) {
            var output = time + ',' + data[axisIndex];
            script.stdin.write(output + '\n');
        }, function(err) {
            script.stdin.write('\n\n');
        });



    });

};