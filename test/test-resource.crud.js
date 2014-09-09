/** Test the CRUD module
 *
 * Note that I'm using the "event" resource description. I suppose that I could use
 * some generic resource, but that's pretty difficult to test. Plus, these tests
 * were ported from the original implementation where they tested events. So,
 * eventDescription it is.
 *
 */



var proxyquire = require('proxyquire').callThru().noPreserveCache();
var _ = require('underscore')._;

var path = '../lib/resource.crud';
var eventDescriptionPath = '../lib/resource.description.event';
var cassandraPath = './support.datasource.cassandra';


exports['resource.crud find'] = {
    setUp: function (callback) {
        var self = this;
        var proxyquireOptions = {};

        proxyquireOptions[cassandraPath] = {
            execute: function (options) {
                self.execute(options);
            }
        };

        this.sut = proxyquire(path, proxyquireOptions).find;
        this.eventDescription = require(eventDescriptionPath);
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
            test.done();
        };

        this.sut(this.eventDescription, query, null, null, function () {
        });
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
            options.callback();
        };

        var index = 0;

        function rowCallback(resource) {
            test.deepEqual(resource, cassandraResults[index++]);
        }

        function callback() {
            test.done();
        }

        this.sut(this.eventDescription, {}, {}, rowCallback, callback);
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
            options.callback();
        };

        var index = 0;

        function rowCallback(resource) {
            test.deepEqual(resource, queryResults[index++]);
        }

        function callback() {
            test.done();
        }

        this.sut(this.eventDescription, {a: {$gt: 2}}, {$orderBy: {a: 1}, $skip: 1, $limit: 1}, rowCallback, callback);
    }
};


function prepareStubs(self, functionName) {
    var proxyquireOptions = {};

    proxyquireOptions[cassandraPath] = {
        execute: function (options) {
            self.execute(options);
        },
        '@global': true
    };


    // Convenience id
    self.id = '10563808-1ee5-44e9-a3e3-5c904e840976';
    // Provide a default execute
    self.event = {"id": self.id, "datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040890833, "startTime": 1409040871633, "type": "Wave", "summaryStatistics": {}, "source": {'type': 'auto'}};

    // We need to pretend that this event exists in order to update it.
    self.execute = function (options) {
        // Make sure it's a select statement, and with the correct id
        if (/^SELECT/.test(options.query) && options.query.indexOf(self.id) !== -1) {
            options.rowCallback(self.event);
            options.callback(null, 1);
        } else {
            options.callback(null, 0);
        }
    };

    self.sut = proxyquire(path, proxyquireOptions)[functionName];
    self.eventDescription = require(eventDescriptionPath);

    // Function to replicate the "find" function, used for update and delete
    self.find = function (query, options, rowCallback, callback) {
        if (query.id === self.id) {
            rowCallback(self.event);
            callback(null, 1);
        } else {
            callback(null, 0);
        }
    };

}


exports['resource.crud create'] = {
    setUp: function (callback) {
        prepareStubs(this, 'create');
        callback();
    },
    'basic': function (test) {

        var newEvent = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave'
        };

        function callback() {
            test.done();
        }

        this.sut(this.eventDescription, newEvent, callback);
    },
    'missing keys sent create do not pass': function (test) {
        function callback(err) {
            test.ok(err, 'error must be defined');
        }

        var newEvent = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave'
        };

        var clonedEvent = _.clone(newEvent);
        delete clonedEvent.startTime;
        this.sut(this.eventDescription, clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.endTime;
        this.sut(this.eventDescription, clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.datasetId;
        this.sut(this.eventDescription, clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.type;
        this.sut(this.eventDescription, clonedEvent, callback);

        test.done();
    },
    'too many keys or non-crate keys created do not pass': function (test) {
        function callback(err) {
            test.ok(err, 'error must be defined');
        }

        var newEventA = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave',
            extra: 'hello?'
        };
        this.sut(this.eventDescription, newEventA, callback);

        var newEventB = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave',
            summaryStatistics: {}
        };
        this.sut(this.eventDescription, newEventB, callback);

        test.done();
    },
    'allows defining source': function (test) {
        function callback(err) {
            test.ok(!err, 'error should not be defined');
        }

        var newEvent = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave',
            source: {
                type: 'auto'
            }
        };

        this.sut(this.eventDescription, newEvent, callback);

        test.done();
    }
};

exports['resource.crud update'] = {
    setUp: function (callback) {
        prepareStubs(this, 'update');

        callback();
    },
    'basic': function (test) {
        var updatedEvent = {
            startTime: 1234
        };


        test.expect(1);
        function callback(err) {
            test.ok(!err);
            test.done();
        }

        this.sut(this.find, this.eventDescription, this.id, updatedEvent, callback);
    },
    'throws errors': function (test) {
        // The counter is a bit of a hack since test.done() doesn't work with async delays...
        var expectedTests = 4;
        test.expect(expectedTests);
        var counter = 0;

        function callback(err) {
            counter++;
            test.ok(err);
            if (counter === expectedTests) {
                test.done();
            }
        }

        // Can't update with just non-editable values
        this.sut(this.find, this.eventDescription, this.id, {
            id: this.id
        }, callback);

        this.sut(this.find, this.eventDescription, this.id, {
            nonExistentKey: 'hello'
        }, callback);

        // Should fail with a non-existent id
        this.sut(this.find, this.eventDescription, '07bf7e59-3f80-4762-a0bf-bb37d1107e04', {
            startTime: 1234
        }, callback);

        // Should run event checks, one of which is startTime < endTime
        this.sut(this.find, this.eventDescription, this.id, {
            startTime: 9999999999999
        }, callback);
    }
};

exports['resource.crud delete'] = {
    setUp: function (callback) {
        prepareStubs(this, 'delete');
        callback();
    },
    'basic': function (test) {
        var self = this;

        function callback(err, resource) {
            test.ok(!err);
            test.deepEqual(resource, self.event);
            test.done();
        }

        this.sut(this.find, this.eventDescription, this.id, callback);
    },
    'errors': function (test) {
        var self = this;

        function callback(err, resource) {
            test.ok(err);
            test.done();
        }

        this.sut(this.find, this.eventDescription, '05b4a41e-94f8-4ac8-affe-9586c35191c9', callback);
    }
};
