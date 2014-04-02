var spawn = require('child_process').spawn;

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

exports.post = function(req, res, next) {
    var filename = req.files.file.name.split(".")[0];

    // First, create a new dataset:
    var title = req.body.title;
    if (title === "") {
        title = filename;
    }

    var newDataset = {
        title: title,
        owner: req.user.id
    };

    datasetResource.create(newDataset, function(err, datasetList) {

        var dataset = datasetList[0];
        var id = dataset.id;

        panelResource.create({datasetId: id}, function(err, newPanelList) {
            var newPanel = newPanelList[0];

            var parserncParameters = [];
            parserncParameters.push('-jar');
            parserncParameters.push('bin/parsernc.jar');
            parserncParameters.push('--nodeaddress');
            parserncParameters.push('localhost');
            parserncParameters.push('--input');
            parserncParameters.push(req.files.file.path);
            parserncParameters.push('--uuid');
            parserncParameters.push(newPanel.id);

            var parsernc = spawn('java', parserncParameters);
            parsernc.stdout.setEncoding('utf8');
            parsernc.stderr.setEncoding('utf8');

            res.render('processupload', {page_title: 'Processing', dataset: dataset});

            parsernc.on('exit', function(code, signal) {
                var processingInfo = parsernc.stderr.read();
                var processingStatistics = JSON.parse(parsernc.stdout.read());

                if (code !== 0) {
                    log.error('Non zero code! ' + code + ': ' + processingInfo);
                }


                var datasetUpdate = {
                    source: {
                        scad: processingStatistics,
                        filename: req.files.file.name
                    },
                    headPanelId: newPanel.id
                };


                panelResource.calculatePanelProperties(newPanel.id, function(additionalProperties) {
                    var startTime = additionalProperties.startTime;
                    var endTime = additionalProperties.endTime;

                    var panelUpdate = {
                        startTime: startTime,
                        endTime: endTime,
                        axes: processingStatistics.columns
                    };
                    console.log('axes: ' + JSON.stringify(panelUpdate.axes));

                    // Integrity check
                    if (startTime !== processingStatistics.datasetStartTime) {
                        log.error('Calculated panel start time ' + startTime + ' not equal to given start time ' + processingStatistics.datasetStartTime);
                    }
                    if (endTime !== processingStatistics.datasetEndTime) {
                        log.error('Calculated panel end time ' + endTime + ' not equal to given end time ' + processingStatistics.datasetEndTime);
                    }

                    datasetResource.update(id, datasetUpdate, function(err) {
                        if (err) {
                            log.error('RNC Process dataset udate unsucessful: ' + err);
                        }
                    }, true);

                    panelResource.update(newPanel.id, panelUpdate, function(err1) {
                        if (err1) {
                            log.error('Error updating panel: ' + err1);
                        }
                        summaryStatisticsResource.calculate(newPanel.id, startTime, endTime, function(statistics) {
                            panelResource.update(newPanel.id, {summaryStatistics: statistics}, function(err) {
                                if (err) {
                                    log.error('RNC Process dataset summary statistics update unsuccessful: ' + err);
                                }
                            }, true);
                        });
                    }, true);

                });

            });
        });


    });
};