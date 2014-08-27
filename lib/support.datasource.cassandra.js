var assert = require('assert');


var config = require('./config');
var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});


exports.execute = function(options) {
    var query = options.query;
    var mapToResource = options.mapToResource;
    var rowCallback = options.rowCallback;
    var doneCallback = options.doneCallback;
    var errorCallback = options.errorCallback;
    
    assert(typeof mapToResource === 'function');
    
    client.eachRow(query, [],
            function(n, row) {
                if (typeof rowCallback === 'function') {
                    rowCallback(mapToResource(row), n);
                }
            },
            function(err, rowCount) {
                if (err) {
                    console.log('Error: ' + err);
                    if (typeof errorCallback === 'function') {
                        errorCallback(err);
                    }
                } else {
                    if (typeof doneCallback === 'function') {
                        doneCallback(rowCount);
                    }
                }
            });
};