
var config = require('./config');
var cassandra = new (require('node-cassandra-cql').Client)({
    hosts: config.cassandraHosts,
    keyspace: config.cassandraKeyspace
});

var log = require('./support.logger');

exports.execute = function (options) {
    var query = options.query;
    var mapToResource = options.mapToResource;
    var rowCallback = options.rowCallback;
    var doneCallback = options.doneCallback;
    var errorCallback = options.errorCallback;

    cassandra.eachRow(query, [],
        function (n, row) {
            if (typeof rowCallback === 'function') {
                rowCallback(mapToResource(row), n);
            }
        },
        function (err, rowCount) {
            if (err) {
                log.error('Error in Cassandra: ' + err);
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
