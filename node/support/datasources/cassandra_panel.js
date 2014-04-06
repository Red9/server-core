var moment = require('moment');
var underscore = require('underscore')._;
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});

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
        // Called each subsequent time
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

Bucket.prototype.hasData = function() {
    return this.count !== 0;
};


function createCacheInsertQuery(id, buckets, startTime, endTime, minmax, time, data) {

    data = underscore.flatten(data);

    return {
        query: 'INSERT INTO raw_data_cache (id,buckets,start_time,end_time,minmax,time,data) VALUES (?,?,?,?,?,?,?) USING TTL 604800', // One week ttl
        params: [
            {
                value: id,
                hint: 'uuid'
            },
            {
                value: buckets,
                hint: 'int'
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
                value: minmax,
                hint: 'boolean'
            },
            {
                value: time,
                hint: 'timestamp'
            },
            {
                value: data,
                hint: 'list<float>'
            }
        ]
    };
}

/** This function get's a bucketed panel without cache.
 * 
 * @param {type} panelId
 * @param {type} startTime
 * @param {type} endTime
 * @param {type} buckets
 * @param {type} minmax
 * @param {type} callbackRow
 * @param {type} callbackDone
 * @returns {undefined}
 */
function internalGetBucketedPanel(panelId, startTime, endTime, buckets, minmax, callbackRow, callbackDone) {
    var panelDuration = endTime - startTime;
    var bucketDuration = Math.floor(panelDuration / buckets);
    if (bucketDuration === 0) {
        bucketDuration = 1; // Minimum 1ms buckets
    }
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

                // While loop to account for empty buckets.
                while (rowTime > currentBucketStartTime + bucketDuration) {
                    if (bucket.hasData() === true) {
                        var bucketTime = bucket.getTime();
                        var bucketDataRow = bucket.getResultRow();
                        callbackRow(bucketTime, bucketDataRow, bucketRow);


                        bucketRow = bucketRow + 1;
                    }
                    currentBucketStartTime = currentBucketStartTime + bucketDuration;
                    bucket.resetBucket(currentBucketStartTime);
                }
                bucket.addRow(rowData);
            },
            function(err) {
                // Send last bucket
                var bucketTime = bucket.getTime();
                var bucketDataRow = bucket.getResultRow();
                callbackRow(bucketTime, bucketDataRow, bucketRow);

                if (err) {
                    log.error('Cassandra Database Panel Get Error: ' + err);
                }
                callbackDone(err);
            }
    );
}

/** If cache is enabled:
 * - uses if buckets in cache
 * - stores buckets in cache if cache miss
 * 
 * @param {type} panelId
 * @param {type} startTime
 * @param {type} endTime
 * @param {type} buckets
 * @param {type} minmax
 * @param {type} cache
 * @param {type} callbackRow
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getBucketedPanel = function(panelId, startTime, endTime,
        buckets, minmax, cache,
        callbackRow, callbackDone) {


    if (cache !== 'on') {
        internalGetBucketedPanel(panelId, startTime, endTime, buckets, minmax, callbackRow, callbackDone);
        return;
    }
    // else, we want to work with the cache

    var cacheQuery = 'SELECT time, data FROM raw_data_cache WHERE id=? AND buckets=? AND start_time=? AND end_time=? AND minmax=?';
    var cacheParameters = [
        {
            value: panelId,
            hint: 'uuid'
        },
        {
            value: buckets,
            hint: 'int'
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
            value: minmax,
            hint: 'boolean'
        }
    ];
    cassandraDatabase.execute(cacheQuery, cacheParameters, function(err, result) {
        if (err) {
            log.error('Error getting panel cache: ' + err + ', ' + err.stack);
        }
        if (typeof result.rows === 'undefined' || result.rows.length === 0) {
            // Could not find cache
            var cacheBatch = [];
            internalGetBucketedPanel(panelId, startTime, endTime, buckets, minmax,
                    function(time, data, index) {
                        cacheBatch.push(createCacheInsertQuery(panelId, buckets, startTime, endTime, minmax, time, data));
                        callbackRow(time, data, index);
                    },
                    function(err) {
                        callbackDone(err);
                        cassandraDatabase.executeBatch(cacheBatch, function(err) {
                            if (err) {
                                log.error('Error inserting cache: ' + err);
                            }
                        });
                    });

        } else {
            // Found cache!
            underscore.each(result.rows, function(row, index) {

                var data = row.data;
                var values = [];

                if (minmax === true) {
                    // Convert the flat list of min/avg/max to nested arrays.
                    for (var i = 0; i < data.length / 3; i++) {
                        var temp = [];
                        temp.push(data[i * 3 + 0]);
                        temp.push(data[i * 3 + 1]);
                        temp.push(data[i * 3 + 2]);
                        values.push(temp);
                    }
                } else { // minmax === false, so we don't need to process the array at all.
                    values = data;
                }
                callbackRow(row.time, values, index);
            });
            callbackDone();
        }
    });
};

exports.getPanel = function(panelId, startTime, endTime,
        callbackRow, callbackDone) {
    var chunkLimit = 5000; // 5000 seems to be a little bit faster than 1000
    var query = 'SELECT time, data FROM raw_data WHERE id=? AND time>=? AND time<=? LIMIT ' + chunkLimit;

    var previousChunkLength;
    var totalRowIndex = 0;
    var lastRowTime = startTime;

    async.doWhilst(
            function(callbackWhilst) { // While loop body
                var parameters = [
                    {
                        value: panelId,
                        hint: 'uuid'
                    },
                    {
                        value: lastRowTime+1, // +1 so that we don't get a row twice.
                        hint: 'timestamp'
                    },
                    {
                        value: endTime,
                        hint: 'timestamp'
                    }
                ];
                
                cassandraDatabase.eachRow(query, parameters,
                        function(n, row) {
                            lastRowTime = moment(row.time).valueOf();
                            callbackRow(lastRowTime, row.data, totalRowIndex++);
                        },
                        function(err, rowLength) {
                            previousChunkLength = rowLength;
                            if (err) {
                                log.error(err);
                            }
                            callbackWhilst(err);
                        }
                );
            },
            function() { // Truth Test
                return previousChunkLength === chunkLimit;
            },
            function(err) {
                if (err) {
                    log.error('Error while getting chunked panel: ' + err);
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
                cassandraDatabase.execute(item.query, [rawDataId], function(err, row) {
                    if (err || row.rows.length !== 1) {
                        log.debug('Error calculating panel properties: ' + err);
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

    cassandraDatabase.executeBatch(queries, callback);
};