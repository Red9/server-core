var _ = require('underscore')._;
var proxyquire = require('proxyquire').callThru().noPreserveCache();

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

function prepareCassandraProxy(self, functionName) {
    var proxyquireOptions = {};

    proxyquireOptions[cassandraPath] = {
        execute: function (options) {
            self.execute(options);
        }
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
}

exports['support.resource.event checkSource'] = {
    setUp: function (callback) {
        this.sut = require(path).checkSource;
        callback();
    },
    'basic': function (test) {
        var validSourceA = {
            type: 'manual'
        };
        test.ok(!this.sut(validSourceA));

        var validSourceB = {
            type: 'auto'
        };
        test.ok(!this.sut(validSourceB));

        var invalidSource = {
            type: 'whatever'
        };
        test.ok(this.sut(invalidSource));
        test.ok(this.sut(''));
        test.ok(this.sut({}));

        test.done();
    }
};

exports['support.resource.event checkEvent'] = {
    setUp: function (callback) {
        this.sut = require(path).checkEvent;
        callback();
    },
    'basic': function (test) {
        test.expect(1);
        var event = {
            startTime: 1234,
            endTime: 2345,
            source: {
                type: 'auto'
            }
        };
        this.sut(event, function (err) {
            test.ok(!err);
            test.done();
        });
    }
};


exports['support.resource.event find'] = {
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
            test.done();
        };

        this.sut(query, null, null, function () {
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

        this.sut({}, {}, rowCallback, callback);
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

        this.sut({a: {$gt: 2}}, {$orderBy: {a: 1}, $skip: 1, $limit: 1}, rowCallback, callback);
    }
};

exports['support.resource.event create'] = {
    setUp: function (callback) {
        prepareCassandraProxy(this, 'create');
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

        this.sut(newEvent, callback);
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
        this.sut(clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.endTime;
        this.sut(clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.datasetId;
        this.sut(clonedEvent, callback);

        clonedEvent = _.clone(newEvent);
        delete clonedEvent.type;
        this.sut(clonedEvent, callback);

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
        this.sut(newEventA, callback);

        var newEventB = {
            startTime: 1234,
            endTime: 12345,
            datasetId: 'c2ade0e5-9a65-441b-89b8-ef0488ca9e8f',
            type: 'Wave',
            summaryStatistics: {}
        };
        this.sut(newEventB, callback);

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

        this.sut(newEvent, callback);

        test.done();
    }
};

exports['support.resource.event update'] = {
    setUp: function (callback) {
        prepareCassandraProxy(this, 'update');
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

        this.sut(this.id, updatedEvent, callback);
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
        this.sut(this.id, {
            id: this.id
        }, callback);

        this.sut(this.id, {
            nonExistentKey: 'hello'
        }, callback);

        // Should fail with a non-existent id
        this.sut('07bf7e59-3f80-4762-a0bf-bb37d1107e04', {
            startTime: 1234
        }, callback);

        // Should run event checks, one of which is startTime < endTime
        this.sut(this.id, {
            startTime: 9999999999999
        }, callback);
    }
};

exports['support.resource.event delete'] = {
    setUp: function (callback) {
        prepareCassandraProxy(this, 'delete');
        callback();
    },
    'basic': function (test) {
        var self = this;

        function callback(err, resource) {
            test.ok(!err);
            test.deepEqual(resource, self.event);
            test.done();
        }

        this.sut(this.id, callback);
    },
    'errors': function (test) {
        var self = this;

        function callback(err, resource) {
            test.ok(err);
            test.done();
        }

        this.sut('05b4a41e-94f8-4ac8-affe-9586c35191c9', callback);
    }
};

exports['support.resource.event end to end tests with live database'] = {
    setUp: function (callback) {
        this.sut = require(path);
        callback();
    },
    'basic': function (test) {

        var inputEvent = {"datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040125393, "startTime": 1409040110033, "type": "Wave", };
        var self = this;
        var newStartTime = 12345473;
        test.expect(11);

        self.sut.create(inputEvent, function (err, createdEvent) {
            test.ok(!err);

            self.sut.find({id: createdEvent.id}, null,
                function (searchResult) {
                    test.deepEqual(searchResult, createdEvent, 'search result should match created event');
                },
                function (err, rowCount) {
                    test.ok(!err);
                    test.strictEqual(rowCount, 1, 'should get only one result');

                    self.sut.update(createdEvent.id, {startTime: newStartTime}, function (err) {
                        test.ifError(err);
                        self.sut.find({id: createdEvent.id}, null,
                            function (event) {
                                test.strictEqual(event.startTime, newStartTime);
                            },
                            function (err, rowCount) {
                                test.ok(!err);
                                test.strictEqual(rowCount, 1, 'should get only one result');

                                self.sut.delete(createdEvent.id, function (err) {
                                    test.ok(!err);
                                    self.sut.find({id: createdEvent.id}, null,
                                        function (row) {
                                            console.log('##### Got row: ' + JSON.stringify(row));
                                        },
                                        function (err, rowCount) {
                                            test.ok(!err);
                                            test.strictEqual(rowCount, 0, 'should not get any rows after delete');
                                            test.done();
                                        });
                                });
                            });
                    });

                });

        });
    }
};































