var cassandraDatabase = requireFromRoot('support/datasources/cassandra');
var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandra = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});

var async = require('async');

exports.getEventsByDataset = function(datasetId, callbackItem, callbackDone) {
    var command = 'SELECT * FROM event WHERE dataset=?';
    var parameters = [
        {
            value: datasetId,
            hint: 'uuid'
        }
    ];

    cassandraDatabase.rawGetAll(command, parameters, 'event', callbackItem,
            callbackDone);
};

exports.getDatasetCount = function(datasetId, doneCallback) {
    var parameters = [
        {
            value: datasetId,
            hint: 'uuid'
        }
    ];

    var queries = [
        {
            query: 'SELECT count(*) FROM event WHERE dataset = ?',
            params: parameters,
            key: 'event'
        },
        {
            query: 'SELECT count(*) FROM comment WHERE resource = ?',
            params: parameters,
            key: 'comment'

        },
        {
            query: 'SELECT count(*) FROM video WHERE dataset = ?',
            params: parameters,
            key: 'video'
        }
    ];

    async.reduce(queries, {},
            function(memo, query, callback) {
                cassandra.execute(query.query, query.params, function(err, result) {
                    if (err) {
                        log.error('Cassandra Error: ' + err);
                    }
                    memo[query.key] = result.rows[0].count.low;
                    callback(null, memo);
                });
            },
            function(err, result) {
                if (err) {
                    log.error('Error: ' + err);
                }
                doneCallback(result);
            });
};