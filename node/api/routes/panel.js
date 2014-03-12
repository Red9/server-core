var underscore = require('underscore')._;
var readline = require('readline');
var async = require('async');
var validator = require('validator');

var log = requireFromRoot('support/logger').log;

var panelResource = requireFromRoot('support/resources/panel');
var datasetResource = requireFromRoot('support/resources/dataset');
var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');




function simplifyOutput(panelArray) {
    underscore.each(panelArray, function(element, index, list) {
    });
    return panelArray;
}

exports.search = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    panelResource.getPanel(req.query, function(panel) {
        if (simpleOutput) {
            panel = simplifyOutput(panel);
        }
        res.json(panel);
    });
};

exports.get = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    panelResource.getPanel({id: req.param('id')}, function(panel) {
        if (simpleOutput) {
            panel = simplifyOutput(panel);
        }
        res.json(panel);
    });
};



exports.create = function(req, res, next) {

    var newPanel = {
        datasetId: req.param('datasetId')
    };

    console.log('newPanel: ' + JSON.stringify(newPanel));

    if (underscore.some(newPanel, function(value) {
        return typeof value === 'undefined';
    })) {
        res.status(403).json({message: 'Must include required parameters to create panel.'});
    } else {
        panelResource.createPanel(newPanel, function(err, panel) {
            if (typeof panel === 'undefined') {
                res.status(500).json({message: 'Could not create panel: ' + err});
            } else {
                res.json(panel);
            }
        });
    }
};

exports.delete = function(req, res, next) {
    var id = req.param('id');

    panelResource.deletePanel(id, function(err) {
        if (err) {
            res.status(500).json({message: err});
        } else {
            res.json({});
        }
    });
};




exports.getBody = function(req, res, next) {
    var parameters = {
        id: req.param('id')
    };


    if (validator.isInt(req.param('buckets'))) {
        parameters.buckets = parseInt(req.param('buckets'));
    }
    if (validator.isInt(req.param('startTime'))) {
        parameters.startTime = parseInt(req.param('startTime'));
    }
    if (validator.isInt(req.param('endTime'))) {
        parameters.endTime = parseInt(req.param('endTime'));
    }

    if (typeof req.param('minmax') !== 'undefined') {
        parameters.minmax = true;
    }

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

    panelResource.getPanelBody(parameters,
            function(axes) {
                if (format === 'csv') {
                    res.write('time');
                    underscore.each(axes, function(axis) {
                        res.write(',' + axis);
                    });
                    res.write('\n');

                } else if (format === 'json') {
                    axes.unshift('time');
                    res.write('"labels":' + JSON.stringify(axes) + ',');
                    res.write('"values":[');
                    res.write('\n');
                }

            },
            function(time, values, rowIndex) {
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
        panel.startTime = properties.startTime;
        panel.endTime = properties.endTime;

        var panelId = panel.id;
        // Need to update the panel so that summary statistics can get the columns
        panelResource.updatePanel(panelId, panel, function(err1, updatedResource) {
            summaryStatisticsResource.calculate(panelId, properties.startTime, properties.endTime, function(statistics) {
                panelResource.updatePanel(panelId, {summaryStatistics: statistics}, function(err2, updatedResource) {
                    if (err1 || err2) {
                        log.error('Error update insert complete function: ' + err1 + " " + err2);
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

    // TODO(SRLM): Match the database: Get the dataset and make sure that temporaryId actually exists
    var id = req.param('id');

    panelResource.getPanel({id: id}, function(panelList) {
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
