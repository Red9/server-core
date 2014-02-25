var underscore = require('underscore')._;
var readline = require('readline');
var async = require('async');
var validator = require('validator');

var log = requireFromRoot('support/logger').log;

var panelResource = requireFromRoot('support/resources/panel');
var datasetResource = requireFromRoot('support/resources/dataset');


exports.search = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};


exports.get = function(req, res, next) {
    
    var parameters = {
        datasetId: req.param('id')
    };
    
    
    if(validator.isInt(req.param('buckets'))){
        parameters.buckets = parseInt(req.param('buckets'));
    }
    if(validator.isInt(req.param('startTime'))){
        parameters.startTime = parseInt(req.param('startTime'));
    }
    if(validator.isInt(req.param('endTime'))){
        parameters.endTime = parseInt(req.param('endTime'));
    }
    
    if(typeof req.param('minmax') !== 'undefined'){
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

    panelResource.getPanel(parameters,
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
                    res.write('' + time);
                    
                    underscore.each(values, function(value){
                       res.write(',');
                        
                       if(underscore.isArray(value)){
                           // Deal with min/avg/max, if present
                           underscore.each(value, function(v, index){
                               if(index !== 0){
                                   res.write(';');
                               }
                               res.write('' + v);
                           });
                       }else{
                           res.write('' + value);
                       }
                    });
                    res.write('\n');
                    
                } else if (format === 'json') {
                    if(rowIndex > 0){
                        res.write(',\n');
                    }
                    values.unshift(time);
                    res.write(JSON.stringify(values));
                }
            },
            function(err) {
                if (err) {
                    log.debug('Get panel Error: ' + err);
                }

                if (format === 'json') {
                    res.write('\n]\n}');
                }

                res.end();
            }
    );
};

exports.create = function(req, res, next) {
    var datasetId = req.param('id');
    var temporaryId = req.param('temporaryId');

    if (typeof temporaryId === 'undefined') {
        // First time reply with new temporary key.
        panelResource.createTemporaryPanel(datasetId, function(err, newTemporaryId) {
            if (err) {
                next();
            } else {
                res.json({
                    temporaryId: newTemporaryId
                });
            }
        });
    } else {
        console.log('temporaryId: ' + temporaryId);
        // Second time update the panel with the new temporary.
        datasetResource.updateToNewPanel(datasetId, temporaryId, function(err) {
            if (err) {
                res.status(501).json({message: err});
            } else {
                res.json({message: 'Successfully updated panel.'});
            }
        });


    }
};

var parseLine = function(line, rows) {
    var columns = line.split(',');
    var time = parseInt(columns.shift());
    var data = [];

    underscore.each(columns, function(value) {
        data.push(parseFloat(value));
    });

    if (isNaN(time) === false) {
        rows.push({time: time, axes: data});
    }
};


function updateInsertCompleteFunction(previousChunk, res) {
    if (previousChunk !== '') {
        console.log('Last line: "' + previousChunk + '"');
        //lineCount = lineCount + 1;
    }
    console.log('Sending response');
    res.json({message: 'Read a bunch of lines.'});
}

var processLines = function(parameters, callback) {

    var temporaryId = parameters.temporaryId;
    var lines = parameters.lines;

    var rows = [];
    underscore.each(lines, function(line, index) {
        parseLine(line, rows);
    });

    panelResource.addRows(temporaryId, rows, function(err) {
        if (err) {
            console.log('Insert rows error: ' + err);
        }
        callback();
    });
};



exports.update = function(req, res, next) {
    // Check for temporaryId. If set then it indicates that we should use that
    // panel instead of the default.
    // 

    // TODO(SRLM): Match the database: Get the dataset and make sure that temporaryId actually exists
    var datasetId = req.param('id');
    var temporaryId = req.param('temporaryId');
    if (typeof temporaryId !== 'undefined') {
        if (req.is('text/*')) {
            req.setEncoding('utf8');





            // We can finish in one of two places, depending on timing. If the
            // database insert happens real quick we'll end in the 'end' method
            // of the req stream. But if the database insert takes a while, the
            // req.on('end') function will fire *first*, *then* the database
            // callback.
            //
            // We have to be preparped to end in either spot.
            // TODO(SRLM): Validate this algorithm for correctness.

            var reqEnd = false;
            var chunksNotDone = 0;
            var processingQueue = async.queue(processLines, 1);

            var firstChunk = true;
            var previousChunk = '';
            req.on('data', function(chunk) {
                chunksNotDone = chunksNotDone + 1;
                console.log('Queue: chunksNotDone: ' + chunksNotDone);

                if (firstChunk === true) {
                    firstChunk = false;
                    var endOfFirstLine = chunk.indexOf('\n');
                    var firstLine = chunk.substr(0, endOfFirstLine);
                    console.log('First line: ' + firstLine);
                    //TODO(SRLM): Do something more intelligent here.
                    chunk = chunk.substr(endOfFirstLine + 1);
                }

                var temp = previousChunk + chunk;
                var lines = temp.split('\n');
                previousChunk = lines.pop();

                parameters = {
                    lines: lines,
                    temporaryId: temporaryId
                };
                processingQueue.push(parameters, function() {
                    chunksNotDone = chunksNotDone - 1;
                    console.log('Dequeue: chunksNotDone: ' + chunksNotDone);

                    if (reqEnd === true && chunksNotDone === 0) {
                        console.log('Finishing after database callback');
                        updateInsertCompleteFunction(previousChunk, res);
                    }
                });
            });

            req.on('end', function() {
                console.log('End reached. Chunks counter = ' + chunksNotDone);
                if (chunksNotDone === 0) {
                    // Finish here
                    console.log('Finishing after req end');
                    updateInsertCompleteFunction(previousChunk, res);
                } else { // Finish in the on('data') database callback
                    reqEnd = true;
                }
            });
        } else {
            next();
        }
    } else {
        next();
    }



};

exports.delete = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};
