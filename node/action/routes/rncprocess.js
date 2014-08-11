var spawn = require('child_process').spawn;
var Busboy = require('busboy');
var os = require('os');
var path = require('path');
var fs = require('fs');
var inspect = require('util').inspect;
var validator = require('validator');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var useful = requireFromRoot('support/useful');
var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

var sockets = requireFromRoot('action/socketroutes/socketmanager');

exports.post = function(req, res, next) {
    if (req.headers['content-length'] === '0') {
        res.status(403).json({message: 'You must post a valid form. POSTed form is empty.'});
        return;
    }

    console.log('Headers: ' + JSON.stringify(req.headers, null, ' '));

    var busboy = new Busboy({headers: req.headers});

    var tempId = useful.generateUUID();
    var tempPath = path.join(config.rncDirectory, tempId + '.RNC');
    var upload = {};

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        if (fieldname === 'rnc' && typeof upload.filename === 'undefined') {
            file.pipe(fs.createWriteStream(tempPath));
            upload.filepath = tempPath;
            upload.userFilename = filename;
        } else {
            // Wrong file type, discard.
            file.resume();
        }
    });

    busboy.on('field', function(fieldname, value, valueTruncated, keyTruncated) {
        console.log('field: ' + fieldname + ', "' + value + '", "' + valueTruncated + '", "' + keyTruncated + '"');
        if (value !== '') {
            upload[fieldname] = value;
        }
    });

    busboy.on('finish', function() {
        var valid = validateUpload(upload);
        if (typeof valid === 'undefined') {
            processRNC(upload, function(id) { // Processing started
                res.json({
                    message: 'Processing in progress.',
                    datasetId: id
                });
            }, function(err, id) { // Processing done
                if (typeof err !== 'undefined') {
                    // Delete the uploaded file.
                    fs.unlink(tempPath, function() {
                    });
                } else {
                    var newPath = path.join(config.rncDirectory, id + '.RNC');
                    fs.rename(tempPath, newPath, function() {
                        // Done 
                    });
                }

            });
        } else {
            res.status(403).json({message: 'Upload failed: ' + valid});

            // Delete the uploaded file.
            fs.unlink(tempPath, function() {
            });
        }
    });

    return req.pipe(busboy);
};

function validateUpload(upload) {
    console.log('upload: ' + JSON.stringify(upload, null, ' '));
    if (typeof upload.owner === 'undefined') {
        return 'Must specify an owner key.';
    } else if (validator.isUUID(upload.owner) === false) {
        return 'owner must be a valid UUID.';
    }

    return undefined;
}


/**
 * 
 * @param {type} upload
 * @param {function} datasetCreatedCallback (datasetId) Called when processing starts
 * @param {function} doneCallback (err, datasetId) Called when all processing is done.
 */
function processRNC(upload, datasetCreatedCallback, doneCallback) {
    var broadcastId = 'upload' + useful.generateInt(0, 999);

    if (typeof upload.title === 'undefined') {
        upload.title = upload.userFilename;
    }

    var newDataset = {
        title: upload.title,
        owner: upload.owner
    };

    datasetResource.create(newDataset, function(err, datasetList) {
        var dataset = datasetList[0];
        var id = dataset.id;

        datasetCreatedCallback(id);

        panelResource.create({datasetId: id}, function(err, newPanelList) {
            var newPanel = newPanelList[0];

            var parserncParameters = [];
            parserncParameters.push('-jar');
            parserncParameters.push('bin/parsernc.jar');
            parserncParameters.push('--nodeaddress');
            parserncParameters.push('localhost');
            parserncParameters.push('--input');
            parserncParameters.push(upload.filepath);
            parserncParameters.push('--uuid');
            parserncParameters.push(newPanel.id);

            var parsernc = spawn('java', parserncParameters);
            parsernc.stdout.setEncoding('utf8');
            parsernc.stderr.setEncoding('utf8');

            // Read this as we go along so that the user can get live updates.
            var processingInfo = '';
            var stderrListener = useful.createStreamToLine(function(line) {
                processingInfo += line;
                sockets.broadcastStatus(broadcastId, line);
            });
            parsernc.stderr.on('data', stderrListener);

            parsernc.on('exit', function(code, signal) {
                var processingStatistics = JSON.parse(parsernc.stdout.read());

                // Clean up the last bit of output.
                stderrListener('\n');

                if (code !== 0) {
                    var errorMessage = 'Non zero code! ' + code + ': ' + processingInfo;
                    log.error(errorMessage);

                    datasetResource.delete(id, function() {
                    });
                    doneCallback(errorMessage, id);
                    return;
                }

                var datasetUpdate = {
                    source: {
                        scad: processingStatistics,
                        filename: upload.userFilename
                    },
                    headPanelId: newPanel.id
                };


                panelResource.calculatePanelProperties(newPanel.id, false, function(err, additionalProperties) {
                    var startTime = additionalProperties.startTime;
                    var endTime = additionalProperties.endTime;

                    var panelUpdate = {
                        startTime: startTime,
                        endTime: endTime,
                        axes: processingStatistics.columns
                    };

                    // Integrity check
                    if (startTime !== processingStatistics.datasetStartTime) {
                        var message = 'Calculated panel start time ' + startTime + ' not equal to given start time ' + processingStatistics.datasetStartTime;
                        log.error(message);
                        sockets.broadcastStatus(broadcastId, message);
                    }
                    if (endTime !== processingStatistics.datasetEndTime) {
                        var message = 'Calculated panel end time ' + endTime + ' not equal to given end time ' + processingStatistics.datasetEndTime;
                        log.error(message);
                        sockets.broadcastStatus(broadcastId, message);
                    }

                    datasetResource.update(id, datasetUpdate, function(err) {
                        if (err) {
                            var message = 'RNC Process dataset udate unsucessful: ' + err;
                            log.error(message);
                            sockets.broadcastStatus(broadcastId, message);
                        }
                    }, true);

                    panelResource.update(newPanel.id, panelUpdate, function(err1) {
                        if (err1) {
                            var message = 'Error updating panel: ' + err1;
                            log.error(message);
                            sockets.broadcastStatus(broadcastId, message);
                        }
                        sockets.broadcastStatus(broadcastId, 'Beginning summary statistics calculation.');
                        summaryStatisticsResource.calculate(newPanel.id, startTime, endTime, function(statistics) {
                            sockets.broadcastStatus(broadcastId, 'Summary statistics calculation complete.');
                            panelResource.update(newPanel.id, {summaryStatistics: statistics}, function(err) {
                                if (err) {
                                    var message = 'RNC Process dataset summary statistics update unsuccessful: ' + err;
                                    log.error(message);
                                    sockets.broadcastStatus(broadcastId, message);
                                }
                                doneCallback(undefined, id);
                            }, true);
                        });
                    }, true);

                });

            });
        });


    });
}
;