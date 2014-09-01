var _ = require('underscore')._;
var proxyquire = require('proxyquire');

var path = '../lib/support.resource.event';
var cassandraPath = './support.datasource.cassandra';

exports['event resource'] = {
    setUp: function (callback) {
        this.sut = require(path).find;

        var self = this;
        var proxyquireOptions = {};

        proxyquireOptions[cassandraPath] = {
            execute: function (options) {
                self.execute(options);
            }
        };

        this.sut = proxyquire(path, proxyquireOptions).find;


        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'correct CQL statement': function (test) {
        var query = {
            type: 'Wave',
            id: 'd3bc9992-7ce3-4c67-9de9-404d61c5d072',
            startTime: {$gt: 1234567} // Red herring option: shouldn't be in Cassandra query
        };
        // Note: may be fragile, since this assumes that the query object is ordered.
        var correctCQL = "SELECT * FROM event WHERE type = 'Wave' AND id = d3bc9992-7ce3-4c67-9de9-404d61c5d072 ALLOW FILTERING";

        test.expect(1);
        this.execute = function (options) {
            test.strictEqual(options.query, correctCQL);
        };

        this.sut(query);
        test.done();
    },
    'all results passed': function (test) {
        var cassandraResults = [
            {a: 4},
            {a: 1},
            {a: 2},
            {a: 3}
        ];

        test.expect(cassandraResults.length);

        this.execute = function (options) {
            _.each(cassandraResults, options.rowCallback);
            options.doneCallback();
        };

        var index = 0;
        function rowCallback(resource) {
            test.deepEqual(resource, cassandraResults[index++]);
        }

        function doneCallback() {
            test.done();
        }

        this.sut({}, {}, rowCallback, doneCallback);
    },
    'local query with orderBy, skip, and limit': function (test) {
        var cassandraResults = [
            {a: 4},
            {a: 1},
            {a: 2},
            {a: 3},
            {a: 5}
        ];
        var queryResults = [
            {a: 4}
        ];

        test.expect(queryResults.length);

        this.execute = function (options) {
            _.each(cassandraResults, options.rowCallback);
            options.doneCallback();
        };

        var index = 0;
        function rowCallback(resource) {
            test.deepEqual(resource, queryResults[index++]);
        }

        function doneCallback() {
            test.done();
        }

        this.sut({a: {$gt: 2}}, {$orderBy: {a: 1}, $skip: 1, $limit: 1}, rowCallback, doneCallback);
    }
};