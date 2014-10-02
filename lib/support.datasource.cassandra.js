var config = require('./config');
var cassandra = new (require('node-cassandra-cql').Client)({
    hosts: config.cassandraHosts,
    keyspace: config.cassandraKeyspace
});

var _ = require('underscore')._;

/**
 * rowCallback (mappedResource, currentRow)
 * callback (err, rowCount)
 * @param options
 */
exports.execute = function (options) {
    var query = options.query;
    var rowCallback = options.rowCallback;
    var callback = options.callback;

    cassandra.eachRow(query, [],
        function (n, row) {
            if (_.isFunction(rowCallback)) {
                rowCallback(row, n);
            }
        },
        callback);
};
