var moment = require('moment');
var spawn = require('child_process').spawn;
var underscore = require('underscore')._;
var validator = require('validator');
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});

var datasetResource = requireFromRoot('support/resources/dataset');

/**
 * 
 * @param {type} panelParameters
 * @param {type} dataset
 * @param {type} commandOptions
 * @returns {unresolved}
 */
function computeColumns(panelParameters, dataset, commandOptions) {
    var columns = dataset.axes;
    console.log('A columns: ' + columns);
    if (typeof panelParameters['axes'] !== 'undefined') {
        //Get the intersection with the Dataset axes
        // so that we only request columns that we actually have.

        columns = underscore.intersection(
                panelParameters['axes'].split(','), dataset.axes);
        console.log('A.5 columns: ' + columns);
        if (columns.length === 0) {
            // Default to all axes if the intersection returns an empty set.
            columns = dataset['column_titles'];
        }
        console.log('A.9 columns: ' + columns);
    }

    //result['columns'] = columns;
    console.log('B columns: ' + columns);

    var columnString = "";

    underscore.each(columns, function(value, index, list) {
        if (index === 0) {
            columnString = value;
        } else {
            columnString += ',' + value;
        }
    });

    if (columnString !== "") {
        commandOptions.push('--columns');
        commandOptions.push(columnString);
    }
    console.log('C columns: ' + columns);

    return columns;
}


/**
 * 
 * @param {type} panelParameters
 * @param {type} dataset
 * @returns {extractParameters.result}
 */
function extractParameters(panelParameters, dataset) {
    var result = {};

    var commandOptions = [];

    commandOptions.push('-jar');
    commandOptions.push(config.downsamplerPath);

    commandOptions.push('--uuid');
    commandOptions.push(dataset['id']);


    if (typeof panelParameters['minmax'] !== 'undefined') {
        if (panelParameters['minmax'] !== 'false') {
            commandOptions.push('--minmax');
        }
    }

    if (typeof panelParameters['nocache'] !== 'undefined') {
        commandOptions.push('--nocache');
    }

    if (typeof panelParameters['startTime'] !== 'undefined') {
        if (validator.isNumeric(panelParameters['startTime']) === true) {
            commandOptions.push('--start_time');
            commandOptions.push(panelParameters['startTime']);
        }
    }

    if (typeof panelParameters['endTime'] !== 'undefined') {
        if (validator.isNumeric(panelParameters['endTime']) === true) {
            commandOptions.push('--end_time');
            commandOptions.push(panelParameters['endTime']);
        }
    }

    if (typeof panelParameters['buckets'] !== 'undefined') {
        if (validator.isInt(panelParameters['buckets']) === true) {
            commandOptions.push('--buckets');
            commandOptions.push(panelParameters['buckets']);
        }
    }

    result['columns'] = computeColumns(panelParameters, dataset, commandOptions);

    result['format'] = 'csv'; // Default to CSV
    if (typeof panelParameters['format'] !== 'undefined') {
        if (panelParameters['format'] === 'csv') {
            result['format'] = 'csv';
        } else { // Default to JSON
            result['format'] = 'json';
        }
    }

    result['commandOptions'] = commandOptions;


    return result;
}

/**
 * 
 * @param {type} commandOptions
 * @param {type} format
 * @param {type} callbackData
 * @param {type} callbackDone
 * @returns {undefined}
 */
function SpawnDownsampler(commandOptions, format, callbackData, callbackDone) {
    var downsampler = spawn('java', commandOptions);

    var readline = require('readline');
    var stdin = readline.createInterface({
        input: downsampler.stdout,
        output: downsampler.stdin
    });

    var stderr = readline.createInterface({
        input: downsampler.stderr,
        output: downsampler.stdin
    });


    stdin.on('line', function(line) {
        if (format === 'csv') {
            callbackData(line);
        } else if (format === 'json') {
            // Convert from strings to numerical values.
            line = line.split(",");
            line[0] = parseInt(line[0]);
            for (var i = 1; i < line.length; i++) {
                // Check to see if the values have min/avg/max.
                if (line[i].split(';').length > 1) {
                    line[i] = line[i].split(';');
                    for (var j = 0; j < line[i].length; j++) {
                        line[i][j] = parseFloat(line[i][j]);
                    }
                } else {
                    line[i] = parseFloat(line[i]);
                }
            }
            callbackData(line);
        }
    });

    var stderrOutput = "";
    stderr.on('line', function(line) { // Most of the time not used.
        stderrOutput += line + "\n";
    });

    downsampler.on('close', function(code) {
        stdin.close();
        stderr.close();
        if (stderrOutput !== "") {
            log.warn("Standard error not empty: " + stderrOutput);
        }

        if (code !== 0) {
            log.warn('Downsampler non zero exit: ' + code);
            callbackDone('Downsampler non zero exit: ' + code);
        } else {
            callbackDone();
        }
    });
}


/**
 * 
 * @param {type} datasetId
 * @param {type} panelParameters
 * @param {type} callbackDataset Returns the associated dataset.
 * @param {type} callbackData Called for each row of data.
 * @param {type} callbackDone Called after everything completes.
 * @returns {undefined}
 */
exports.getPanelFromDataset = function(datasetId, panelParameters,
        callbackDataset, callbackData, callbackDone) {
    datasetResource.getDatasets({id: datasetId}, function(datasetList) {
        if (underscore.isArray(datasetList) === false
                || datasetList.length !== 1) {
            callbackDone('No dataset matches ID');
        } else {
            var dataset = datasetList[0];
            var parameters = extractParameters(panelParameters, dataset);

            callbackDataset(dataset, parameters['columns']);

            SpawnDownsampler(parameters['commandOptions'], parameters['format'],
                    callbackData, callbackDone);

        }
    });
};



function Bucket(time, includeMinMax) {
    this.includeMinMax = includeMinMax;
    this.resetBucket(time);
}

Bucket.prototype.resetBucket = function(time) {
    this.time = time;
    this.count = 0;

    this.sum = undefined;
    this.minimum = undefined;
    this.maximum = undefined;
};

Bucket.prototype.addRow = function(newValues) {
    this.count = this.count + 1;

    if (typeof this.minimum === 'undefined') {
        // Called for the first time
        this.sum = [];
        if (this.includeMinMax === true) {
            this.minimum = [];
            this.maximum = [];
        }

        underscore.each(newValues, function(value) {
            this.sum.push(value);
            if (this.includeMinMax === true) {
                this.minimum.push(value);
                this.maximum.push(value);
            }
        }, this);
    } else {
        underscore.each(newValues, function(value, index) {
            this.sum[index] += value;
            if (this.includeMinMax === true) {
                if (this.minimum[index] > value) {
                    this.minimum[index] = value;
                }
                if (this.maximum[index] < value) {
                    this.maximum[index] = value;
                }
            }
        }, this);
    }
};

Bucket.prototype.getResultRow = function() {
    var result = [];

    underscore.each(this.sum, function(sum, index) {
        var average = sum / this.count;
        if (this.includeMinMax === true) {
            result.push([
                this.minimum[index],
                average,
                this.maximum[index]
            ]);
        } else {
            result.push(average);
        }
    }, this);
    return result;
};

Bucket.prototype.getTime = function() {
    return this.time;
};


exports.getBucketedPanel = function(panelId, startTime, endTime,
        buckets, minmax, cache,
        callbackRow, callbackDone) {

    var panelLength = endTime - startTime;
    var bucketDuration = panelLength / buckets;
    var currentBucketStartTime = startTime;

    var bucket = new Bucket(currentBucketStartTime, minmax);

    var bucketRow = 0;

    var previousN = -1;

    exports.getPanel(panelId, startTime, endTime,
            function(rowTime, rowData, n) {
                if (n !== previousN + 1) {
                    log.error('n(' + n + ') !== previousN(' + previousN + ')');
                }
                previousN = n;

                if (rowTime > currentBucketStartTime + bucketDuration) {
                    //TODO(SRLM): What if the bucket doesn't have anything in it?
                    // Empty Bucket
                    currentBucketStartTime = currentBucketStartTime + bucketDuration;
                    callbackRow(bucket.getTime(), bucket.getResultRow(), bucketRow);
                    bucket.resetBucket(currentBucketStartTime);
                    bucketRow = bucketRow + 1;
                }
                bucket.addRow(rowData);
            },
            function(err) {
                // Send last bucket
                callbackRow(bucket.getTime(), bucket.getResultRow(), bucketRow);

                if (err) {
                    log.error('Cassandra Database Panel Get Error: ' + err);
                }
                callbackDone(err);
            }
    );
};


exports.getPanel = function(panelId, startTime, endTime,
        callbackRow, callbackDone) {
    var query = 'SELECT time, data FROM raw_data WHERE id=? AND time>=? and time<=?';

    var parameters = [
        {
            value: panelId,
            hint: 'uuid'
        },
        {
            value: startTime,
            hint: 'timestamp'
        },
        {
            value: endTime,
            hint: 'timestamp'
        }
    ];

    var previousN = -1;
    cassandraDatabase.eachRow(query, parameters,
            function(n, row) {
                if (n !== previousN + 1) {
                    log.error('n(' + n + ') !== previousN(' + previousN + ')');
                }
                previousN = n;
                callbackRow(moment(row.time).valueOf(), row.data, n);
            },
            function(err, rowLength) {
                if (err) {
                    log.error(err);
                }
                callbackDone(err);
            });
};

























exports.calculatePanelProperties = function(rawDataId, callback) {
    // Warning: these keys are sensitive to matching the keys in dataset resource!
    var properties = [
        {
            key: 'startTime',
            query: 'SELECT time FROM raw_data WHERE id=? LIMIT 1',
            default: 0,
            queryKey: 'time',
            type: 'timestamp'

        },
        {
            key: 'endTime',
            query: 'SELECT time FROM raw_data WHERE id=? ORDER BY time DESC LIMIT 1',
            default: 0,
            queryKey: 'time',
            type: 'timestamp'
        }
    ];

    var result = {};

    async.eachSeries(properties,
            function(item, asyncCallback) {
                console.log("Executing " + item.query);
                cassandraDatabase.execute(item.query, [rawDataId], function(err, row) {
                    if (err || row.rows.length !== 1) {
                        console.log('Error calculating panel properties: ' + err);
                        result[item.key] = item.default;
                    } else {
                        var value = row.rows[0].get(item.queryKey);
                        if (item.type === 'timestamp') {
                            value = moment(value).valueOf();
                        } else if (item.type === 'int') {
                            value = parseInt(value);
                        }

                        result[item.key] = value;
                    }
                    asyncCallback();
                });
            },
            function(err) {
                callback(result);
            });
};


exports.deletePanel = function(panelId, callback) {
    var query = 'DELETE FROM raw_data WHERE id=?';
    cassandraDatabase.execute(query, [panelId], callback);
};


function constructAddRowQuery(panelId, time, axes) {
    var query = 'INSERT INTO raw_data(id, time, data) VALUES (?,?,?)';

    //console.log('Inserting values ' + panelId + ', ' + time);

    var parameters = [
        {
            value: panelId,
            hint: 'uuid'
        },
        {
            value: time,
            hint: 'timestamp'
        },
        {
            value: axes,
            hint: 'list<float>'
        }
    ];
    return {
        query: query,
        params: parameters
    };
}



exports.addRows = function(panelId, rows, callback) {
    var queries = [];
    underscore.each(rows, function(row) {
        queries.push(constructAddRowQuery(panelId, new Date(row.time), row.axes));
    });

    cassandraDatabase.executeBatch(queries, cassandraRoot.types.consistencies.quaum, null, callback);
};