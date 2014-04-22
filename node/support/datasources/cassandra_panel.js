var moment = require('moment');
var underscore = require('underscore')._;
var async = require('async');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});


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