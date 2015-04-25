'use strict';

var nconf = require('nconf');

var stream = require('stream');
var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Boom = require('boom');
var async = require('async');

var maximumEventsCreatedInParallel = 4;

// We need this export for the migration. Otherwise, since the nconf that the
// migration script gets and the nconf that this file gets are different, we
// won't have valid nconf values to use.
exports.init = function (nconf_) {
    nconf = nconf_;
};

/**
 *
 * @param {Number} id
 * @returns {String}
 */
function createFilename(id) {
    return path.join(nconf.get('panelDataPath'), '' + id) + '.RNC';
}

/** A little helper function that makes it easier to always check for a panel
 * before doing something.
 *
 * Looks and checks to see if there is a valid panel in the data store.
 *
 * This function will call the error callback if the file doesn't exist or some
 * other filesystem error.
 *
 * @param {Number} id
 * @param {Function} errorCallback Called if there is an error. This should go
 *                  back to the client.
 * @param {Function} successCallback Called if there's no errors
 */
function checkForPanelHelper(id, errorCallback, successCallback) {
    fs.stat(createFilename(id), function (err, stats) {
        if (err) {
            errorCallback(err);
        } else if (!stats.isFile()) {
            errorCallback(
                new Boom.badRequest('Panel with id ' + id + ' does not exist.')
            );
        } else {
            successCallback();
        }
    });
}

/**
 *
 * @param {String} inputFilename
 * @param {String} outputFilename
 * @param {Function} callback (err)
 */
function correctFile(inputFilename, outputFilename, callback) {
    // Open up the RNC and look at the start time. If it's valid, then do
    // nothing
    // If it's gibberish then replace it with the default time.
    // In the future we can go through and have it pull out the GPS time
    // and use that.
    var parameters = [
        '--inputFile',
        inputFilename,
        '--outputFile',
        outputFilename,
        '--default',
        0 // Use unix epoch as the fallback time.
    ];

    execFile(nconf.get('RNCTools:correctPath'), parameters, {
        maxBuffer: 1024 * 1024,
        timeout: 120000 /* timeout in milliseconds */
    }, function (err, stdout, stderr) {
        callback(err);
    });
}

/** Add a new panel to the data store
 *
 * @warning this won't hesitate to overwrite an existing panel.
 *
 * @param {Number} id The id of the dataset that this panel belongs to.
 * @param {Stream} inputStream The file, as a stream. This will be written
 *                      directly to disk.
 * @param {Function} callback (err) Called once the file is written and
 *                      corrected, or if an error occurs.
 */
function createPanel(id, inputStream, callback) {
    var uploadFilename = createFilename(id + '.upload');
    var filename = createFilename(id);

    inputStream.pipe(fs.createWriteStream(uploadFilename));
    inputStream.on('end', function () {
        correctFile(uploadFilename, filename, callback);
    });
    inputStream.on('error', function (err) {
        callback(err);
    });
}

/** Takes care of the details of handling a panel and a dataset.
 *
 * @param {Object} server
 * @param {Object} models
 * @param {Object} newDataset The dataset object to store in the DB
 * @param {ReadableStream} panelStream A stream representing the panel data
 * @param {Function} callback (err, updatedDataset)
 */
exports.create = function (server, models, newDataset, panelStream, callback) {
    models.dataset
        .create(newDataset)
        .then(function (createdDataset) {
            createPanel(createdDataset.id, panelStream, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                models.dataset.calculateStatistics(createdDataset, null,
                    function (err, dataset) {
                        callback(err, dataset);

                        // Let's go ahead and event find if appropriate.
                        if (!err && dataset.sport === 'surf') {
                            server.log(['debug'], 'Starting upload prompted event finding');
                            exports.runEventFinder(server, models, dataset.id, dataset.startTime, dataset.endTime, function (err) {
                                if (err) {
                                    server.log(['error'], 'Error in auto event finding on upload.');
                                    server.log(['error'], err);
                                } else {
                                    server.log(['debug'], 'Upload prompted event finding complete.');
                                }
                            });
                        }
                    });
            });
        })
        .catch(function (err) {
            callback(Boom.badRequest(err));
        });
};

/**
 *
 * @param {Number} id
 * @param {Object} options
 * @param {Function} callback (err, ReadableStream)
 */
exports.readPanelCSV = function (id, options, callback) {
    checkForPanelHelper(id, callback, function () {

        var filename = createFilename(id);
        var parameters = [
            '--inputFile',
            filename,
            '--csvOutput'
        ];

        if (_.has(options, 'csPeriod')) {
            parameters.push('--csPeriod');
            parameters.push(options.csPeriod);
        } else {
            callback(Boom.badImplementation('Must provide a csPeriod'));
            return;
        }

        if (_.has(options, 'startTime') && _.has(options, 'endTime')) {
            parameters.push('--startTime');
            parameters.push(options.startTime);
            parameters.push('--endTime');
            parameters.push(options.endTime);
        }

        var reader = spawn(nconf.get('RNCTools:processorPath'), parameters);
        reader.stdout.setEncoding('utf8');
        reader.stderr.setEncoding('utf8');

        reader.on('exit', function (code, signal) {
            if (code !== 0) {
                // Throwing probably isn't the best option here...
                throw Boom.badImplementation('Exit code invalid: ' + code +
                ' stderr: ' + reader.stderr.read());
            }
        });

        reader.on('error', function (err) {
            // Again, throwing probably isn't the best option here...
            throw Boom.wrap(err, 500, 'Something went wrong with the streams.');
        });

        if (_.has(options, 'axes')) {
            var outputStream = stream.Readable();
            outputStream._read = function (size) {
            };

            var firstLine = true;
            var indexMap = [];

            var buffer = '';

            reader.stdout.on('data', function (chunk) {
                buffer += chunk;
                var lines = buffer.split('\n');

                function createIndexMap(column) {
                    if (_.indexOf(options.axes, column) !== -1) {
                        indexMap.push(true);
                    } else {
                        indexMap.push(false);
                    }
                }

                function indexMapFilter(value, index) {
                    return indexMap[index];
                }

                while (lines.length > 1) {
                    var line = lines.shift().split(',');

                    if (firstLine) {
                        firstLine = false;
                        _.each(line, createIndexMap);
                    }

                    outputStream.push(
                        _.filter(line, indexMapFilter).join(',') + '\n'
                    );
                }
                buffer = lines.join('\n');
            });

            reader.stdout.on('end', function () {
                outputStream.push(null);
            });

            callback(null, outputStream);
        } else {
            // Pass through un-modified.
            callback(null, reader.stdout);
        }
    });
};

/** Get the JSON representation of the panel.
 *
 * @param {Object} server optionally null.
 * @param {Number} id
 * @param {Object} options supported options are:
 * @param {Number} [options.csPeriod] the number of milliseconds to set the
 *                           cross section to
 * @param {Number} [options.rows] the approximate number of output rows
 * @param {Number} [options.startTime] output rows whose timestamp is equal to
 *                          or greater than this time
 * @param {Number} [options.endTime] output rows whose timestamp is equal to or
 *                          less than this time
 * @param {Object} [options.properties] Specify if you want properties of the
 *                          panel.
 * @param {Object} [options.panel] Specify if you want panel output.
 * @param {Object} [options.statistics] an object. Specify if you want panel
 *                          summary statistics.
 * @param {Object|Number} [options.filters] Specific any low pass filter alpha
 *                          values. Keynames are sensor types, values are
 *                          0.0 - 1.0 alpha values for the low pass filter.
 *
 * @param {Function} callback (err, result) result is a JSON object.
 */
exports.readPanelJSON = function (server, id, options, callback) {
    // Check parameters
    if (_.has(options, 'csPeriod') && _.has(options, 'rows')) {
        callback(
            Boom.badImplementation('Must provide only one of csPeriod or rows.')
        );
        return;
    }

    // If we specify one of startTime or endTime, we have to specify both.
    // If we specify rows then we have to to specify startTime and endTime.
    // If they're not specified then we'll need to read it from the panel on the
    // first time, then use that to "inject" it into another call. This is sub
    // optimal (it would be faster if we used the dataset resource's startTime
    // and endTime), but it's self contained and simple.
    if (_.has(options, 'startTime') !== _.has(options, 'endTime') ||
        (_.has(options, 'rows') &&
        (!_.has(options, 'startTime') || !_.has(options, 'endTime')))) {

        callback(
            Boom.badImplementation('Must provide startTime and/or end time.')
        );
        return;
    }

    checkForPanelHelper(id, callback, function () {
        var filename = createFilename(id);
        var parameters = [
            '--inputFile',
            filename
        ];

        if (_.has(options, 'csPeriod')) {
            parameters.push('--csPeriod');
            parameters.push(options.csPeriod);
        }

        if (_.has(options, 'rows')) {
            parameters.push('--rows');
            parameters.push(options.rows);
        }

        if (_.has(options, 'startTime')) {
            parameters.push('--startTime');
            parameters.push(options.startTime);
        }

        if (_.has(options, 'endTime')) {
            parameters.push('--endTime');
            parameters.push(options.endTime);
        }

        if (_.has(options, 'properties')) {
            parameters.push('--jsonProperties');
        }

        if (_.has(options, 'statistics')) {
            parameters.push('--jsonStatistics');
        }

        if (_.has(options, 'panel')) {
            parameters.push('--jsonPanel');
        }

        if (_.has(options, 'filters')) {
            _.each(options.filters, function (value, name) {
                parameters.push('--filter');
                parameters.push(name + ',' + value);
            });
        }

        execFile(nconf.get('RNCTools:processorPath'), parameters, {
            maxBuffer: 1024 * 1024 * 10, // 10 MB
            timeout: 120000 /* timeout in milliseconds */
        }, function (err, stdout, stderr) {
            if (err) {
                callback(err);
            } else {
                var output = {};
                try {
                    output = JSON.parse(stdout);
                } catch (e) {
                    if (server) {
                        server.log(['error'],
                            'readPanelJSON parsing error: ' + e);
                    } else {
                        console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                        console.log('readPanelJSON parsing error: ' + e);
                        console.log('------------------------------------');
                    }
                }
                callback(null, output);
            }
        });
    });
};

/**
 *
 * @param {Number} id
 * @param {Function} callback (err)
 */
exports.deletePanel = function (id, callback) {
    checkForPanelHelper(id, callback, function () {
        // For some reason it appears that unlink doesn't call it's callback.
        // So, we'll just assume things went peachy.
        fs.unlink(createFilename(id, function (err) {
            if (err) {
                throw Boom.wrap(err, 500,
                    'The unexpected: fs.unlink gave an error!');
            }
        }));

        fs.unlink(createFilename(id + '.upload', function (err) {
            if (err) {
                throw Boom.wrap(err, 500,
                    'The unexpected: fs.unlink gave an error! On .upload');
            }
        }));

        callback(null);
    });
};

var eventFinderAxes = [
    'time',
    'acceleration:x',
    'acceleration:z',
    'rotationrate:x',
    'rotationrate:y',
    'magneticfield:x',
    'gps:speed'
];

var eventFinderCommands = [
    {
        command: 'wave',
        parameters: {
            eventType: 'Wave',
            strictness: 1,
            windowSize: 256,
            overlapStep: 50,
            wThresholdDirection: 'above',
            pThresholdDirection: 'below',
            tThresholdDirection: 'below',
            wThreshold: 0.7,
            pThreshold: 1.5,
            tThreshold: 1.5,
            wMergeThreshold: 500,
            pMergeThreshold: 200,
            tMergeThreshold: 200,
            ampThreshold: 0.1,
            accThreshold: 0.7,
            g: 10,
            minLength: 5,
            maxAcc: 11,
            maxAcc2: 15,
            speedThresh: 0.2,
            accPortion1: 0.6,
            accPortion2: 0.3,
            accPortion3: 0.15
        }
    },
    {
        command: 'paddle',
        parameters: {
            eventType: 'Paddle',
            windowSize: 256,
            overlapStep: 50,
            pThresholdDirection: 'below',
            pThreshold: 1.5,
            pMergeThreshold: 200,
            minLength: 5
        }
    },
    // Remove duck dive finding since it appears to be rather inaccurate.
    //{
    //    command: 'duckdive',
    //    parameters: {
    //        eventType: 'Duck Dive',
    //        windowSize: 256,
    //        overlapStep: 50,
    //        dThresholdDirection: 'above',
    //        dThreshold: 0.8,
    //        dMergeThreshold: 100,
    //        lowThX: 0.4,
    //        hiThX: 0.3,
    //        lowThZ: 0.3,
    //        hiThZ: 0.5,
    //        minLengthX: 30,
    //        varLength: 10,
    //        minLengthZ: 20
    //    }
    //},
    {
        command: 'exit'
    }
];

/**
 * @param {Object} server
 * @param {Object} models
 * @param {Number} id
 * @param {Number} startTime
 * @param {Number} endTime
 * @param {Function} doneCallback (err)
 */
exports.runEventFinder = function (server, models, id, startTime, endTime,
                                   doneCallback) {
    var functionStartTime = new Date().getTime();
    checkForPanelHelper(id, doneCallback, function () {
        var parameters = [
            nconf.get('eventFinderMainFile')
        ];

        var process = execFile('Rscript', parameters, {
            cwd: nconf.get('eventFinderPath'),
            maxBuffer: 1024 * 1024 * 1024,
            timeout: 1200000 /* timeout in milliseconds */
        }, function (err, stdout, stderr) {
            if (err) {
                server.log(['warning'], 'Rscript error: ' + err +
                ', stderr: ' + stderr);
                doneCallback(err);
            } else {
                var resultLines = stdout.trim().split('\n');
                if (resultLines.length !== eventFinderCommands.length - 1) {
                    server.log(['error'],
                        Boom.badImplementation(
                            'Incorrect number of result lines on stdout', stdout
                        ));
                } else {

                    var eventList =
                        _.chain(resultLines)
                            .map(function (line) {
                                try {
                                    return JSON.parse(line).results;
                                } catch (e) {
                                    return null;
                                }
                            })
                            .flatten()
                            .filter(_.isObject)
                            .map(function (event) {
                                event.datasetId = id;
                                event.source = {
                                    type: 'auto',
                                    algorithm: 'eventfinder'
                                };
                                return event;
                            })
                            .value();

                    var rscriptStopTime = new Date().getTime();
                    server.log(['debug'], 'Rscript execution time: ' +
                    ((rscriptStopTime - functionStartTime) / 1000));

                    async.mapLimit(eventList, maximumEventsCreatedInParallel,
                        function (event, cb) {
                            models.event
                                .create(event)
                                .then(function (createdEvent) {
                                    cb(null, createdEvent);
                                })
                                .catch(cb);
                        },
                        function (err, results) {
                            if (err) {
                                doneCallback(err);
                            } else {
                                server.log(['debug'], 'Made ' + results.length +
                                ' events');

                                var functionEndTime = new Date().getTime();

                                server.log(['debug'],
                                    'Event creation execution time: ' +
                                    ((functionEndTime - rscriptStopTime) /
                                    1000));

                                server.log(['debug'], 'Total execution time: ' +
                                ((functionEndTime - functionStartTime) / 1000));
                                doneCallback(null, results);
                            }
                        });
                }
            }
        });

        var maximumLines = Math.floor((endTime - startTime) / 10) - 100;
        var totalLines = -1; // Account for header line
        var csvOptions = {
            axes: eventFinderAxes,
            csPeriod: 10,
            startTime: startTime,
            endTime: endTime
        };

        function writeToStdin(data) {
            if (process.stdin.writable) {
                process.stdin.write(data);
            }
        }

        writeToStdin(JSON.stringify({
            rowCount: maximumLines
        }) + '\n');

        exports.readPanelCSV(id, csvOptions, function (err, stream) {
            var previousChunk = '';
            stream.on('data', function (chunk) {
                chunk = previousChunk + chunk;
                var lines = chunk.split('\n');

                // Save the last (possibly incomplete) line for the next time
                // around.
                while (totalLines < maximumLines && lines.length > 1) {
                    writeToStdin(lines.shift() + '\n');
                    totalLines++;
                }
                previousChunk = lines.join('\n');

            });

            stream.on('end', function () {
                _.each(eventFinderCommands, function (command) {
                    writeToStdin(JSON.stringify(command) + '\n');
                });
            });
        });
    });
};
