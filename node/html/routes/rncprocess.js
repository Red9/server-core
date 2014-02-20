var spawn = require('child_process').spawn;

//var database = require('./../../support/database');
var log = require('./../../support/logger').log;
var config = require('./../../config');

var datasetResource = require('./../../support/resources/resource/dataset_resource');
var panelResource = require('./../../support/resources/resource/panel_resource');
var summaryStatisticsResource = require('./../../support/resources/resource/summarystatistics_resource');

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

    datasetResource.createDataset(newDataset, function(err, datasetList) {
        var dataset = datasetList[0];
        var id = dataset.id;

        var datasetUpdate = {
            source:{}
        };

        var parserncParameters = [];
        parserncParameters.push('-jar');
        parserncParameters.push('bin/parsernc.jar');
        parserncParameters.push('--nodeaddress');
        parserncParameters.push('localhost');
        parserncParameters.push('--input');
        parserncParameters.push(req.files.file.path);
        parserncParameters.push('--uuid');
        parserncParameters.push(dataset.panelId);

        var parsernc = spawn('java', parserncParameters);
        parsernc.stdout.setEncoding('utf8');
        parsernc.stderr.setEncoding('utf8');

        res.render('processupload', {page_title: 'Processing', dataset: dataset});

        parsernc.on('exit', function(code, signal) {
            var processingInfo = parsernc.stderr.read();
            var processingStatistics = JSON.parse(parsernc.stdout.read());

            if (code !== 0) {
                console.log('Non zero code! ' + code + ': ' + processingInfo);
            }


            datasetUpdate.axes = processingStatistics.columns;
            datasetUpdate.source.scad = processingStatistics;
            datasetUpdate.source.filename = req.files.file.name;

            panelResource.calculatePanelProperties(dataset.panelId, function(additionalProperties) {
                var startTime = additionalProperties.startTime;
                var endTime = additionalProperties.endTime;
                var rowCount = additionalProperties.rowCount;

                log.debug('startTime: ' + startTime);
                log.debug('endTime: ' + endTime);

                // Integrity check
                if (startTime !== processingStatistics.datasetStartTime) {
                    log.error('Calculated panel start time ' + startTime + ' not equal to given start time ' + processingStatistics.datasetStartTime);
                }
                if (endTime !== processingStatistics.datasetEndTime) {
                    log.error('Calculated panel end time ' + endTime + ' not equal to given end time ' + processingStatistics.datasetEndTime);
                }
                if (rowCount !== processingStatistics.rows) {
                    log.error('Calculated panel rows ' + rowCount + ' not equal to given rows ' + processingStatistics.rows);
                }

                datasetUpdate.startTime = startTime;
                datasetUpdate.endTime = endTime;
                datasetUpdate.rowCount = rowCount;


                datasetResource.updateDataset(id, datasetUpdate, function(err) {
                    if (err) {
                        log.error('RNC Process dataset udate unsucessful: ' + err);
                    }
                }, true);

                summaryStatisticsResource.calculate(id, startTime, endTime, function(statistics) {
                    datasetResource.updateDataset(id, {summaryStatistics: statistics}, function(err) {
                        if (err) {
                            log.error('RNC Process dataset summary statistics update unsuccessful: ' + err);
                        }
                    });
                });

            });

        });


    });
};