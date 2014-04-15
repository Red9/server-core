var spawn = require('child_process').spawn;

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');


var Busboy = require('busboy');
var os = require('os');
var path = require('path');
var fs = require('fs');

var inspect = require('util').inspect;

var validator = require('validator');

exports.post = function(req, res, next) {
    if (req.headers['content-length'] === '0') {
        res.status(403).json({message: 'You must post a valid form. POSTed form is empty.'});
        return;
    }

    var busboy = new Busboy({headers: req.headers});

    var upload = {};

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        if (fieldname === 'rnc' && typeof upload.filename === 'undefined') {
            var saveTo = path.join(os.tmpDir(), path.basename(filename));
            file.pipe(fs.createWriteStream(saveTo));
            upload.filepath = saveTo;
            upload.userFilename = filename;
        } else {
            // Wrong file type, discard.
            file.resume();
        }
    });

    busboy.on('field', function(fieldname, value, valueTruncated, keyTruncated) {
        if(value !== ''){
            upload[fieldname] = value;
        }
    });

    busboy.on('finish', function() {
        var valid = validateUpload(upload);
        if (typeof valid === 'undefined') {            
            processRNC(upload, function(id) {
                res.json({
                    message: 'Processing in progress.',
                    datasetId: id
                });
            });
        } else {
            res.status(403).json({message: 'Upload failed: ' + valid});
        }
    });

    return req.pipe(busboy);
};

function validateUpload(upload) {
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
 * @param {type} datasetCreatedCallback called with datasetId as it's only parameter.
 * @returns {undefined}
 */
function processRNC(upload, datasetCreatedCallback) {

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

            parsernc.stderr.on('data', function(something) {
                //console.log(something);
            });

            parsernc.on('exit', function(code, signal) {
                var processingInfo = parsernc.stderr.read();
                var processingStatistics = JSON.parse(parsernc.stdout.read());

                if (code !== 0) {
                    log.error('Non zero code! ' + code + ': ' + processingInfo);
                }


                var datasetUpdate = {
                    source: {
                        scad: processingStatistics,
                        filename: upload.userFilename
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
}
;