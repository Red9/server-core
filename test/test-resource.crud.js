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
var stubDescriptionPath = './stub.resource.description';
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
        this.stubDescription = require(stubDescriptionPath);
        callback();
    },
    'correct CQL statement': function (test) {
        var query = {
            type: 'Wave',
            id: 'd3bc9992-7ce3-4c67-9de9-404d61c5d072',
            time: {$gt: 1234567} // Red herring option: shouldn't be in Cassandra query
        };
        // Note: may be fragile, since this assumes that the query object is ordered.
        var correctCQL = "SELECT * FROM event WHERE type = 'Wave' AND id = d3bc9992-7ce3-4c67-9de9-404d61c5d072 ALLOW FILTERING";

        test.expect(1);
        this.execute = function (options) {
            test.strictEqual(options.query, correctCQL);
            test.done();
        };

        this.sut(this.stubDescription, query, null, null, function () {
        });
    },
    'all results passed': function (test) {
        var cassandraResults = [
            {time: 4, type: 'a', id: '9d79f26a-263b-4cf9-8b9c-a3a1040cf026'},
            {time: 1, type: 'a', id: '744bebdb-7f8e-4436-b15d-edda9b4eef1f'},
            {time: 2, type: 'a', id: '49e6b99a-461d-4c84-9ceb-96cfd5cf3c5c'},
            {time: 3, type: 'a', id: '36824e74-1d83-4b1b-a7c9-b48be893cbcc'}
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

        this.sut(this.stubDescription, {}, {}, rowCallback, callback);
    },
    'local query with orderBy, skip, and limit': function (test) {
        var cassandraResults = [
            {time: 4, type: 'a', id: '9d79f26a-263b-4cf9-8b9c-a3a1040cf026'},
            {time: 1, type: 'a', id: '744bebdb-7f8e-4436-b15d-edda9b4eef1f'},
            {time: 2, type: 'a', id: '49e6b99a-461d-4c84-9ceb-96cfd5cf3c5c'},
            {time: 3, type: 'a', id: '36824e74-1d83-4b1b-a7c9-b48be893cbcc'},
            {time: 5, type: 'a', id: 'a36f4903-b63d-42bf-a7a3-528b43c685b2'}
        ];
        var queryResults = [
            {time: 4, type: 'a', id: '9d79f26a-263b-4cf9-8b9c-a3a1040cf026'}
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

        this.sut(this.stubDescription, {time: {$gt: 2}}, {$orderBy: {time: 1}, $skip: 1, $limit: 1}, rowCallback, callback);
    }
};


function prepareStubs(self, functionName) {
    var proxyquireOptions = {};

    proxyquireOptions[cassandraPath] = {
        execute: function (options) {
            self.execute(options);
        }
    };


    // Convenience id
    self.id = '10563808-1ee5-44e9-a3e3-5c904e840976';
    // Provide a default execute
    self.event = {id: self.id, time: 1409040871633, type: 'Wave'};

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
    self.stubDescription = require(stubDescriptionPath);

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
            time: 1234,
            type: 'Wave'
        };

        function callback() {
            test.done();
        }

        this.sut(this.stubDescription, newEvent, callback);
    },
    'missing keys sent create do not pass': function (test) {
        function callback(err) {
            test.ok(err, 'error must be defined');
        }

        var newEvent = {
            time: 1234,
            type: 'Wave'
        };

        var clonedEvent = _.clone(newEvent);
        delete clonedEvent.time;
        this.sut(this.stubDescription, clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.type;
        this.sut(this.stubDescription, clonedEvent, callback);

        test.done();
    },
    'too many keys or non-create keys created do not pass': function (test) {
        function callback(err) {
            test.ok(err, 'error must be defined');
        }

        var newEventA = {
            time: 1234,
            type: 'Wave',
            extra: 'hello?'
        };
        this.sut(this.stubDescription, newEventA, callback);

        var newEventB = {
            time: 1234,
            type: 'Wave',
            id: '92174fbc-3b97-4743-979e-dd906776e715'
        };
        this.sut(this.stubDescription, newEventB, callback);

        test.done();
    }
};

exports['resource.crud update'] = {
    setUp: function (callback) {
        prepareStubs(this, 'update');

        callback();
    },
    'basic': function (test) {
        var updatedResource = {
            time: 1234
        };

        test.expect(1);
        function callback(err) {
            test.strictEqual(err, null);
            test.done();
        }

        this.sut(this.find, this.stubDescription, this.id, updatedResource, callback);
    },
    'throws errors': function (test) {
        // The counter is a bit of a hack since test.done() doesn't work with async delays...
        var expectedTests = 4;
        test.expect(expectedTests);
        var counter = 0;

        function callback(err) {
            counter++;
            test.notStrictEqual(err, null);
            if (counter === expectedTests) {
                test.done();
            }
        }

        // Can't update with just non-editable values
        this.sut(this.find, this.stubDescription, this.id, {
            id: this.id
        }, callback);

        this.sut(this.find, this.stubDescription, this.id, {
            nonExistentKey: 'hello'
        }, callback);

        // Should fail with a non-existent id
        this.sut(this.find, this.stubDescription, '07bf7e59-3f80-4762-a0bf-bb37d1107e04', {
            time: 1234
        }, callback);

        // Should run event checks, one of which is time >= 0
        this.sut(this.find, this.stubDescription, this.id, {
            time: -1
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

        this.sut(this.find, this.stubDescription, this.id, callback);
    },
    'errors': function (test) {
        var self = this;

        function callback(err, resource) {
            test.ok(err);
            test.done();
        }

        this.sut(this.find, this.stubDescription, '05b4a41e-94f8-4ac8-affe-9586c35191c9', callback);
    }
};
