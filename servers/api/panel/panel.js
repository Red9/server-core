"use strict";

var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var path = require('path');
var fs = require('fs');
var _ = require('underscore')._;
var nconf = require('nconf');
var Boom = require('Boom');


function createFilename(id) {
    return path.join(nconf.get('rncDataPath'), id) + '.RNC';
}

/** A little helper function that makes it easier to always check for a panel before doing something.
 *
 * Looks and checks to see if there is a valid panel in the data store.
 *
 * This function will call the error callback if the file doesn't exist or some other filesystem error.
 *
 * @param id
 * @param errorCallback Called if there is an error. This should go back to the client.
 * @param successCallback {} Called if there's no errors
 */
function checkForPanelHelper(id, errorCallback, successCallback) {
    fs.stat(createFilename(id), function (err, stats) {
        if (err) {
            errorCallback(err);
        } else if (!stats.isFile()) {
            errorCallback(new Boom.badRequest('Panel with id ' + id + ' does not exist.'));
        } else {
            successCallback();
        }
    });
}

/**
 *
 * @param inputFilename
 * @param outputFilename
 * @param callback
 */
function correctFile(inputFilename, outputFilename, callback) {
    // Open up the RNC and look at the start time. If it's valid, then do nothing
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
 * @param id {string} The id of the dataset that this panel belongs to.
 * @param inputStream {stream} The file, as a stream. This will be written directly to disk.
 * @param callback {function} (err) Called once the file is written, or if an error occurs.
 */
exports.createPanel = function (id, inputStream, callback) {
    var uploadFilename = createFilename(id + '.upload');
    var filename = createFilename(id);

    inputStream.pipe(fs.createWriteStream(uploadFilename));
    inputStream.on('end', function () {
        correctFile(uploadFilename, filename, callback);
    });
    inputStream.on('error', function (err) {
        callback(err);
    });
};


/**
 *
 * @param id {string}
 * @param options {object}
 * @param callback {function}
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
            return Boom.badImplementation('Must provide a csPeriod');
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
                throw Boom.badImplementation('Exit code invalid: ' + code + ' stderr: ' + reader.stderr.read());
            }
        });

        reader.on('error', function (err) {
            // Again, throwing probably isn't the best option here...
            throw Boom.wrap(err, 500, 'Something went wrong with the streams.');
        });

        callback(null, reader.stdout);
    });
};


/** Get the JSON representation of the panel.
 *
 * @param id
 * @param options supported options are:
 *
 *  csPeriod: the number of milliseconds to set the cross section to
 *  rows: the approximate number of output rows
 *  startTime: output rows whose timestamp is equal to or greater than this time
 *  endTime: output rows whose timestamp is equal to or less than this time
 *  properties: an object. Specify if you want properties of the panel.
 *  panel: an object. Specify if you want panel output.
 *  statistics: an object. Specify if you want panel summary statistics.
 *
 * @param callback {err, result} result is a JSON object.
 */
exports.readPanelJSON = function (id, options, callback) {
    // Check parameters
    if (_.has(options, 'csPeriod') && _.has(options, 'rows')) {
        callback(Boom.badImplementation('Must provide only one of csPeriod or rows.'));
        return;
    }

    // If we specify one of startTime or endTime, we have to specify both.
    // If we specify rows then we have to to specify startTime and endTime.
    // If they're not specified then we'll need to read it from the panel on the first time,
    //  then use that to "inject" it into another call. This is sub optimal (it would be
    //  faster if we used the dataset resource's startTime and endTime), but it's self contained
    //  and simple.
    if (_.has(options, 'startTime') !== _.has(options, 'endTime')
        || (_.has(options, 'rows') && (!_.has(options, 'startTime') || !_.has(options, 'endTime')))) {

        callback(Boom.badImplementation('Must provide startTime and/or end time.'));
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

        execFile(nconf.get('RNCTools:processorPath'), parameters, {
            maxBuffer: 1024 * 1024,
            timeout: 120000 /* timeout in milliseconds */
        }, function (err, stdout, stderr) {
            if (err) {
                callback(err);
            } else {
                var output = {};
                try {
                    output = JSON.parse(stdout);
                } catch (e) {
                    console.log('readPanelJSON parsing error: ' + e);
                }
                callback(null, output);
            }
        });
    });
};


/**
 *
 * @param id {string}
 * @param callback {function}
 */
exports.deletePanel = function (id, callback) {
    checkForPanelHelper(id, callback, function () {
        // For some reason it appears that unlink doesn't call it's callback.
        // So, we'll just assume things went peachy.
        fs.unlink(createFilename(id, function (err) {
            if (err) {
                throw Boom.wrap(err, 500, 'The unexpected happened: fs.unlink gave an error!');
            }
        }));

        fs.unlink(createFilename(id + '.upload', function (err) {
            if (err) {
                throw Boom.wrap(err, 500, 'The unexpected happened: fs.unlink gave an error! On .upload');
            }
        }));

        callback(null);
    });
};







