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
            startTime: {$gt: 1234567} // Red herring option: shouldn't be in query
        };

        var correctCQL = "SELECT * FROM event WHERE type = 'Wave' AND id = d3bc9992-7ce3-4c67-9de9-404d61c5d072 ALLOW FILTERING";

        test.expect(1);
        this.execute = function(options){
            test.strictEqual(options.query, correctCQL);
        };


        this.sut(query);
        test.done();
    }
};