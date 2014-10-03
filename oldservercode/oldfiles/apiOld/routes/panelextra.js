var underscore = require('underscore')._;
var async = require('async');
var validator = require('validator');

var log = requireFromRoot('support/logger').log;

var panelResource = requireFromRoot('support/resources/panel');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

var useful = requireFromRoot('support/useful');

exports.getBody = function(req, res, next) {
    var parameters = {
        id: req.param('id')
    };
    
    var partsFunction = useful.prepareParts(req);

    var axes;
    if (validator.isInt(req.param('buckets'))) {
        parameters.buckets = parseInt(req.param('buckets'));
    }
    if (validator.isInt(req.param('startTime'))) {
        parameters.startTime = parseInt(req.param('startTime'));
    }
    if (validator.isInt(req.param('endTime'))) {
        parameters.endTime = parseInt(req.param('endTime'));
    }

    if (typeof req.param('axes') !== 'undefined') {
        axes = req.param('axes').split(',');
    }

    if (req.param('cache') === 'on') {
        parameters.cache = true;
    } else {
        parameters.cache = false;
    }

    if (req.param('format') === 'json') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        panelResource.getProcessedPanel(parameters, function(err, result) {
            if (err) {
                // Write the error message out if we can't output the panel.
                //  Make sure that we escape any quotes in the error message.
                res.write('{\n"message":"' + err.replace(/"/g, '\\"') + '"\n}');
                res.end();
            } else {
                // A bit of gymnastics with the arrays here: teh partsFunction
                // wants input in an array of resources, so we give it that
                // then take out the one that we want.
                res.write(JSON.stringify(partsFunction([result])[0]));
                res.end();
            }
        });
        return;
    }

    // else format CSV
    res.writeHead(200, {'Content-Type': 'text/csv'});


    // Reduce the number of res.write's by using a string to temporarily write
    // the results to, and output after some number of rows.
    var resWriteBuffer = '';

    var axesIndicies = [];

    panelResource.getPanelBody(parameters,
            function(panelProperties) {
                var outputAxes = panelProperties.axes;
                if (typeof axes !== 'undefined') {
                    outputAxes = underscore.intersection(panelProperties.axes, axes);
                }

                underscore.each(outputAxes, function(axis) {
                    axesIndicies.push(underscore.indexOf(panelProperties.axes, axis));
                });

                res.write('time');
                underscore.each(outputAxes, function(axis) {
                    res.write(',' + axis);
                });
                res.write('\n');
            },
            function(time, allValues, rowIndex) {
                var values = [];
                if (axesIndicies.length !== 0) {
                    underscore.each(axesIndicies, function(index) {
                        values.push(allValues[index]);
                    });
                } else {
                    values = allValues;
                }


                resWriteBuffer += time;

                underscore.each(values, function(value) {
                    resWriteBuffer += ',';

                    if (underscore.isArray(value)) {
                        // Deal with min/avg/max, if present
                        underscore.each(value, function(v, index) {
                            if (index !== 0) {
                                resWriteBuffer += ';';
                            }
                            resWriteBuffer += v;
                        });
                    } else {
                        resWriteBuffer += value;
                    }
                });
                resWriteBuffer += '\n';

                if (rowIndex % 100 === 0) {
                    res.write(resWriteBuffer);
                    resWriteBuffer = '';
                }
            },
            function(err) {
                if (err) {
                    log.debug('Get panel Error: ' + err);
                }

                res.write(resWriteBuffer);

                res.end();
            }
    );
};

var parseLine = function(line, rows) {
    var columns = line.split(',');
    var time = parseInt(columns.shift());
    var data = [];

    underscore.each(columns, function(value) {
        data.push(parseFloat(value)); // Is this parse necessary? We're just converting back to text...
    });

    if (isNaN(time) === false) {
        rows.push({time: time, axes: data});
    }
};


function updateInsertCompleteFunction(panel) {
    // Now, we need to update the panel description with start and end times
    panelResource.calculatePanelProperties(panel.id, false, function(err, properties) {
        var panelId = panel.id;
        var modifiedPanel = {
            startTime: properties.startTime,
            endTime: properties.endTime,
            axes: panel.axes
        };


        // Need to update the panel so that summary statistics can get the columns
        panelResource.update(panelId, modifiedPanel, function(err1, updatedResource) {
            summaryStatisticsResource.calculate(panelId, modifiedPanel.startTime, modifiedPanel.endTime, function(statistics) {
                panelResource.update(panelId, {summaryStatistics: statistics}, function(err2, updatedResource) {
                    if (err1 || err2) {
                        log.error('Error update insert complete function: err1: ' + err1 + ', err2: ' + err2);
                    }
                }, true);
            });
        }, true);
    });
}

var processLines = function(parameters, callback) {

    var id = parameters.id;
    var lines = parameters.lines;

    var rows = [];
    underscore.each(lines, function(line) {
        parseLine(line, rows);
    });

    panelResource.addRows(id, rows, function(err) {
        if (err) {
            log.error('Insert rows error: ' + err);
        }
        callback();
    });
};

exports.updateBody = function(req, res, next) {
    // TODO(SRLM): Check to make sure that the uploaded panel is balanced.
    var id = req.param('id');
    panelResource.get({id: id}, function(panelList) {
        if (panelList.length !== 1) {
            next();
        } else if (panelList[0].axes !== null) {
            res.status(403).json({message: 'Can not modify existing panels. Must modify a new panel whose axes === null'});
        } else {
            var panel = panelList[0];
            if (req.accepts('text/*')) {
                req.setEncoding('utf8');

                var chunksNotDone = 0;
                var processingQueue = async.queue(processLines, 1);

                var firstChunk = true;
                var previousChunk = '';
                req.on('data', function(chunk) {
                    chunksNotDone = chunksNotDone + 1;

                    if (firstChunk === true) {
                        firstChunk = false;
                        var endOfFirstLine = chunk.indexOf('\n');
                        var firstLine = chunk.substr(0, endOfFirstLine);

                        panel.axes = firstLine.split(',');
                        if (panel.axes.shift() !== 'time') {
                            log.error('First column of first line should be time: "' + firstLine + '"');
                        }

                        chunk = chunk.substr(endOfFirstLine + 1);
                    }

                    var temp = previousChunk + chunk;
                    var lines = temp.split('\n');
                    previousChunk = lines.pop();

                    var parameters = {
                        lines: lines,
                        id: id
                    };
                    processingQueue.push(parameters, function() {
                        chunksNotDone = chunksNotDone - 1;

                        if (chunksNotDone === 0) {
                            //updateInsertCompleteFunction(panel);
                        }
                    });
                });

                req.on('end', function() {
                    // Send the response as soon as we've got the entire upload.
                    res.json({message: 'Read a bunch of lines. Now processing those lines.'});

                    if (processingQueue.idle() === true) {
                        log.info('Done before end.');
                        updateInsertCompleteFunction(panel);
                    } else {
                        processingQueue.drain = function() {
                            log.info('Still more processing to do after uploading has finished.');
                            updateInsertCompleteFunction(panel);
                        };
                    }
                });
            } else {
                res.status(403).json({message: 'Incorrect content type.'});
            }
        }
    });
};
