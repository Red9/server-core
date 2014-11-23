"use strict";

var _ = require('underscore')._;
var cassandra;
var cassandraDriver = require('cassandra-driver');
var async = require('async');
var Boom = require('boom');
var nconf = require('nconf');

exports.init = function (callback) {
    cassandra = new cassandraDriver.Client({
        contactPoints: nconf.get('cassandraHosts'),
        keyspace: nconf.get('cassandraKeyspace'),
        authProvider: new cassandraDriver.auth.PlainTextAuthProvider(
            nconf.get('cassandraUsername'),
            nconf.get('cassandraPassword')
        )
    });

    cassandra.connect(function (err) {
        if (err) {
            callback(Boom.wrap(err));
        } else {
            callback(null);
        }
    });

    // Uncomment for detailed log messages from the driver
    //cassandra.on('log', function (level, className, message, furtherInfo) {
    //    console.log('log event: %s -- %s', level, message);
    //});
};

/**
 * There's no configuration check here since that's a programmer error, and should be caught very quickly.
 *
 * rowCallback (mappedResource, currentRow)
 * callback (err, rowCount)
 * @param options
 * - query
 * - rowCallback
 * - callback
 * - parameters
 * - hints
 */
exports.execute = function (options) {
    var query = options.query;
    var callback = options.callback;

    var rowCallback = options.rowCallback;
    if (!_.isFunction(rowCallback)) {
        rowCallback = function () {
        };
    }

    var parameters = options.parameters;
    if (!_.isArray(parameters)) {
        parameters = [];
    }

    var queryOptions = {
        autoPage: true,
        prepare: false,
        fetchSize: 250
    };

    if (_.isArray(options.hints)) {
        queryOptions.hints = options.hints;
    }

    //console.log('Query: ' + query);
    //console.dir(parameters);
    //console.dir(options.hints);


    cassandra.eachRow(query, parameters, queryOptions,
        function (n, row) {
            rowCallback(row, n);
        },
        function (err, rowCount) {
            if (err) {
                callback(Boom.wrap(err, 500, 'Internal cassandra error. Please report.'));
            } else {
                callback(null, rowCount);
            }
        });
};

exports.getDatasetCount = function (datasetId, doneCallback) {
    var queries = [
        {
            query: 'SELECT count(*) FROM event WHERE dataset = ?',
            key: 'event'
        },
        {
            query: 'SELECT count(*) FROM comment WHERE resource = ?',
            key: 'comment'

        },
        {
            query: 'SELECT count(*) FROM video WHERE dataset = ?',
            key: 'video'
        }
    ];

    var queryOptions = {
        prepare: true,
        hints: ['uuid']
    };

    async.reduce(queries, {},
        function (memo, query, callback) {
            cassandra.execute(query.query, [datasetId], queryOptions, function (err, result) {
                if (err) {
                    callback(err);
                } else {
                    memo[query.key] = result.rows[0].count.low;
                    callback(null, memo);
                }
            });
        },
        function (err, result) {
            if (err) {
                doneCallback(Boom.wrap(err));
            } else {
                doneCallback(null, result);
            }
        });
};