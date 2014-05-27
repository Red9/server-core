"use strict";

var moment = require('moment');
var underscore = require('underscore')._;
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace, pageSize: 250000});

function constructTask(chunk, panelId, startTime, endTime, serializer, lastChunk) {
    return {
        chunk: chunk,
        query: 'SELECT time, data FROM raw_data WHERE id=? AND time>=? AND time<?',
        parameters: [
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
        ],
        serializer: serializer,
        lastChunk: lastChunk
    };
}

function getDatabaseRows(task, callback) {
    cassandraDatabase.execute(task.query, task.parameters, function cassandraResult(err, result) {
        if (err) {
            log.error('Error: ' + err);
        }
        task.serializer(task.chunk, result.rows, task.lastChunk);
        callback();
    });
}

function processRows(task, callback) {
    for (var index = 0; index < task.rows.length; index++) {
        task.callbackRow(
                moment(task.rows[index].time).valueOf(),
                task.rows[index].data,
                task.startIndex + index
                );
    }
    callback();
}

/** This function will make sure that the database results are sent out in an
 * ordered serial fashion, even if they arrive asynchronously.
 *  
 * @param {function} callbackRow
 * @param {function} callbackDone
 * @returns {function}
 */
function serializeDatabaseRows(callbackRow, callbackDone) {
    // Buffer for storing results if the database results come in the wrong order.
    var buffer = {};

    // The queue to serially process the database results.
    var processQueue = async.queue(processRows, 1);

    var startIndex = 0; // Total row counter
    var currentChunk = 0;

    var lastChunkIndex = -1;

    function processFunction() {
        while (typeof buffer[currentChunk] !== 'undefined') {
            var serializeCallback = lastChunkIndex === currentChunk ? callbackDone : undefined;

            processQueue.push({callbackRow: callbackRow, rows: buffer[currentChunk], startIndex: startIndex}, serializeCallback);
            startIndex += buffer[currentChunk].length;
            
            // Let's not keep unneeded data around.
            delete buffer[currentChunk];
            currentChunk++;
        }
    }

    function handleChunk(chunk, rowsMe, lastChunk) {
        lastChunkIndex = lastChunk ? chunk : lastChunkIndex;
        buffer[chunk] = rowsMe;
        processFunction();
    }

    return handleChunk;
}

/** Get a panel from the database.
 * 
 * This asynchronous, concurrent version of the function is 31% faster than the
 * simple version, at the cost of some code complexity.
 * 
 * @param {uuid} panelId
 * @param {number} startTime
 * @param {number} endTime
 * @param {function} callbackRow (time, data array, row index) Must execute synchronously. Time is in milliseconds since epoch.
 * @param {function} callbackDone ()
 * @param {number} durationLimit Optional. Used for testing.
 * @param {number} concurrencyLimit Optional. Used for testing.
 */
exports.getPanel = function(panelId, startTime, endTime, callbackRow, callbackDone
        , durationLimit, concurrencyLimit) {

    if (startTime >= endTime) {
        // TODO: handle error here
    }

    // Set defaults
    durationLimit = typeof durationLimit === 'undefined' ? 5000 : durationLimit;
    concurrencyLimit = typeof concurrencyLimit === 'undefined' ? 7 : concurrencyLimit;
    
    
    var done = false;
    var chunk = 0;
    var queue = async.queue(getDatabaseRows, concurrencyLimit);

    var serializer = serializeDatabaseRows(callbackRow, callbackDone);

    while (done === false) {
        var nextEndTime = startTime + durationLimit;
        // Make sure that we don't overshoot.
        if (nextEndTime > endTime) {
            nextEndTime = endTime + 1; // +1 so that end time is inclusive.
            done = true;
        }

        var task = constructTask(chunk, panelId, startTime, nextEndTime, serializer, done);
        queue.push(task);

        // Prepare for next iteration.
        startTime = nextEndTime;
        chunk++;
    }

    // Start the queue.
    queue.concurrency = concurrencyLimit;
};


/** Calculates the acutal start and end time from the database panel data.
 * 
 * @param {uuid} rawDataId
 * @param {function} callback (object with keys startTime and endTime)
 */
exports.calculatePanelProperties = function(rawDataId, callback) {
    // Warning: these keys are sensitive to matching the keys in panel resource!
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
                cassandraDatabase.execute(item.query, [rawDataId], function(err, row) {
                    if (err) {
                        asyncCallback('Error calculating '
                                + rawDataId + ' panel properties: ' + err);
                    } else if (row.rows.length !== 1) {
                        asyncCallback('Panel ' + rawDataId + ' does not exist.');
                    } else {
                        var value = row.rows[0].get(item.queryKey);
                        if (item.type === 'timestamp') {
                            value = moment(value).valueOf();
                        } else if (item.type === 'int') {
                            value = parseInt(value);
                        }

                        result[item.key] = value;
                        asyncCallback();
                    }

                });
            },
            function(err) {
                callback(err, result);
            });
};

/** Requests a processed panel from the cache.
 * 
 * @param {uuid} panelId
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} buckets
 * @param {function} callback (processed panel object or undefined)
 */
exports.getCachedProcessedPanel = function(panelId, startTime, endTime, buckets, callback) {
    var query = 'SELECT * FROM raw_data_cache WHERE id=? AND start_time=? AND end_time=? AND buckets=?';

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
        },
        {
            value: buckets,
            hint: 'int'
        }
    ];

    cassandraDatabase.execute(query, parameters, function(err, result) {
        if (err) {
            log.error('Error getting from cache: ' + err);
            callback();
            return;
        } else if (result.rows.length !== 1) {
            callback();
            return;
        }

        callback(JSON.parse(result.rows[0].payload));
    });

};

/** Store a processed panel object
 * 
 * @param {uuid} panelId
 * @param {number} startTime
 * @param {number} endTime
 * @param {number} buckets
 * @param {objecw} payload
 */
exports.putCachedProcessedPanel = function(panelId, startTime, endTime, buckets, payload) {
    var query = 'INSERT INTO raw_data_cache (id, start_time, end_time, buckets, payload) VALUES (?,?,?,?,?) USING TTL 86400';

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
        },
        {
            value: buckets,
            hint: 'int'
        },
        {
            value: JSON.stringify(payload),
            hint: 'varchar'
        }

    ];

    cassandraDatabase.execute(query, parameters, function(err, result) {
        if (err) {
            log.error('Error inserting into cache: ' + err);
        }
    });
};



exports.deletePanel = function(panelId, callback) {
    var query = 'DELETE FROM raw_data WHERE id=?';
    cassandraDatabase.execute(query, [panelId], callback);

    var query = 'DELETE FROM raw_data_cache WHERE id=?';
    cassandraDatabase.execute(query, [panelId], callback);
};


function constructAddRowQuery(panelId, time, axes) {
    var query = 'INSERT INTO raw_data(id, time, data) VALUES (?,?,?)';

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


/** Add rows into a panel. Does not require pre-existing raw data to be added.
 * 
 * @warning does not update the panel resource
 * 
 * @param {uuid} panelId
 * @param {array} rows Array of objects with keys time and axes. Time should be in milliseconds since epoch. Axes should be array of numbers.
 * @param {function} callback
 */
exports.addRows = function(panelId, rows, callback) {
    var queries = [];
    underscore.each(rows, function(row) {
        queries.push(constructAddRowQuery(panelId, new Date(row.time), row.axes));
    });

    cassandraDatabase.executeBatch(queries, callback);
};