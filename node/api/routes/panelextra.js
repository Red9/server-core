var underscore = require('underscore')._;
var async = require('async');
var validator = require('validator');

var log = requireFromRoot('support/logger').log;

var panelResource = requireFromRoot('support/resources/panel');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

exports.getBody = function(req, res, next) {
    var parameters = {
        id: req.param('id')
    };

    var buckets = -1;
    var minmax = false;
    var axes;
    if (validator.isInt(req.param('buckets'))) {
        parameters.buckets = parseInt(req.param('buckets'));
        buckets = parameters.buckets;
    }
    if (validator.isInt(req.param('startTime'))) {
        parameters.startTime = parseInt(req.param('startTime'));
    }
    if (validator.isInt(req.param('endTime'))) {
        parameters.endTime = parseInt(req.param('endTime'));
    }

    // Only have minmax when we have buckets
    if (typeof req.param('minmax') !== 'undefined' && buckets !== -1) {
        parameters.minmax = true;
        minmax = true;
    }

    if (typeof req.param('axes') !== 'undefined') {
        axes = req.param('axes').split(',');
    }

    parameters.cache = req.param('cache');

    var format = 'csv';
    if (req.param('format') === 'json') {
        format = 'json';
    }

    if (format === 'csv') {
        res.writeHead(200, {'Content-Type': 'text/csv'});
    }
    else if (format === 'json') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write('{\n');
    }

    // Reduce the number of res.write's by using a string to temporarily write
    // the results to, and output after some number of rows.
    var resWriteBuffer = '';

    var axesIndicies = [];

    panelResource.getPanelBody(parameters,
            function(panelProperties) {
                var outputAxes = panelProperties.axes;
                if(typeof axes !== 'undefined'){
                    outputAxes = underscore.intersection(panelProperties.axes, axes);
                };

                underscore.each(outputAxes, function(axis) {
                    axesIndicies.push(underscore.indexOf(panelProperties.axes, axis));
                });

                if (format === 'csv') {
                    res.write('time');
                    underscore.each(outputAxes, function(axis) {
                        res.write(',' + axis);
                    });
                    res.write('\n');

                } else if (format === 'json') {
                    outputAxes.unshift('time');
                    res.write(
                            '"labels":' + JSON.stringify(outputAxes) + ','
                            + '"startTime":' + panelProperties.startTime + ','
                            + '"endTime":' + panelProperties.endTime + ','
                            + '"id":"' + panelProperties.id + '",'
                            + '"buckets":' + buckets + ','
                            + '"minmax":' + minmax + ','
                            + '"values":[\n');
                }

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

                if (format === 'csv') {
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

                } else if (format === 'json') {

                    values.unshift(time);

                    if (rowIndex > 0) {
                        resWriteBuffer += ',\n';
                    }
                    resWriteBuffer += JSON.stringify(values);

                    if (rowIndex % 100 === 0) {
                        res.write(resWriteBuffer);
                        resWriteBuffer = '';
                    }

                }
            },
            function(err) {
                if (err) {
                    log.debug('Get panel Error: ' + err);
                }

                res.write(resWriteBuffer);

                if (format === 'json') {
                    res.write('\n]\n}');
                }

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
    panelResource.calculatePanelProperties(panel.id, function(properties) {
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
            console.log('Insert rows error: ' + err);
        }
        callback();
    });
};

exports.updateBody = function(req, res, next) {
    // TODO(SRLM): Check to make sure that the uploaded panel is balanced.

    // TODO(SRLM): Match the database: Get the dataset and make sure that temporaryId actually exists
    var id = req.param('id');

    panelResource.get({id: id}, function(panelList) {
        if (panelList.length !== 1) {
            next();
        } else if (panelList[0].axes !== null) {
            res.status(403).json({message: 'Can not modify existing panels. Must modify a new panel whose axes === null'});
        } else {
            var panel = panelList[0];
            if (req.is('text/*')) {
                req.setEncoding('utf8');

                // We have to be preparped to end in either spot.
                // TODO(SRLM): Validate this algorithm for correctness.

                var chunksNotDone = 0;
                var processingQueue = async.queue(processLines, 1);

                var firstChunk = true;
                var previousChunk = '';
                req.on('data', function(chunk) {
                    chunksNotDone = chunksNotDone + 1;
                    //log.debug('Queue: chunksNotDone: ' + chunksNotDone);

                    if (firstChunk === true) {
                        firstChunk = false;
                        var endOfFirstLine = chunk.indexOf('\n');
                        var firstLine = chunk.substr(0, endOfFirstLine);
                        //log.debug('First line: ' + firstLine);

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
                        //log.debug('Dequeue: chunksNotDone: ' + chunksNotDone);

                        if (chunksNotDone === 0) {
                            if (previousChunk !== '') {
                                //log.debug('Last line: "' + previousChunk + '"');
                            }

                            updateInsertCompleteFunction(panel);
                        }
                    });
                });

                req.on('end', function() {
                    //log.debug('End reached. Chunks counter = ' + chunksNotDone);

                    // Send the response as soon as we've got the entire upload.
                    res.json({message: 'Read a bunch of lines. Now processing those lines.'});

                });
            } else {
                next();
            }
        }
    });
};
