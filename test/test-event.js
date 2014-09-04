var _ = require('underscore')._;
var proxyquire = require('proxyquire').callThru();

var path = '../lib/support.resource.event';
var cassandraPath = './support.datasource.cassandra';

var sampleEvents = [
    {"id": "672daee5-67b3-e6cd-4faf-78a32c2aa4d8", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409039372773, "startTime": 1409039367643, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "582cfe3b-4cea-31f4-fb46-202f66377f74", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409038603473, "startTime": 1409038593233, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "3d9d450a-713e-3900-e001-a3d70a096fa5", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409039342033, "startTime": 1409039306193, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "db167d3d-ba27-e087-646c-1639308bc7ef", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040750033, "startTime": 1409040737233, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "cc41374a-7427-7427-855c-f32fc44613e6", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409042874853, "startTime": 1409042862043, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "902784bf-b4b7-bf54-53c7-845676bb0aff", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040125393, "startTime": 1409040110033, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "7d6c8323-5cbc-d19f-65ec-d01639d72711", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409041729253, "startTime": 1409041702353, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "bfe79f0c-1045-91f5-82a8-073533214ede", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409041757393, "startTime": 1409041740763, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "d9f7b0d4-40e6-91f1-6419-c7647909763d", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409042673893, "startTime": 1409042652123, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "3fde8553-8bff-8b88-0f0e-85fd2e95937b", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409042452433, "startTime": 1409042444753, "type": "Wave", "summaryStatistics": {}, "source": {}},
    {"id": "25afa1aa-ddd9-5f82-f9f9-6784fcd5ab04", "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040890833, "startTime": 1409040871633, "type": "Wave", "summaryStatistics": {}, "source": {}}
];

exports['support.resource.event find proxyquire'] = {
    setUp: function (callback) {
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

// TODO(SRLM): Add tests for event creation.
exports['support.resource.event create proxyquire'] = {
    setUp: function (callback) {
        var self = this;
        var proxyquireOptions = {};

        proxyquireOptions[cassandraPath] = {
            execute: function (options) {
                self.execute(options);
            }
        };

        this.sut = proxyquire(path, proxyquireOptions).create;
        callback();
    },
    basic: function (test) {

        var newEvent = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave'
        };


        this.execute = function (options) {
            options.doneCallback();
        };


        function doneCallback() {
            test.done();
        }

        this.sut(newEvent, doneCallback);
    }
};
