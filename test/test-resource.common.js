var proxyquire = require('proxyquire');
var _ = require('underscore')._;

var path = '../lib/support.resource.common';
var loggerPath = './support.logger';

exports['resource.common extractEqualityConditions'] = {
    setUp: function (callback) {
        this.sut = require(path).divideQueries;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'all results': function (test) {
        var query = {};
        var result = {
            cassandra: {},
            local: {}
        };
        test.deepEqual(this.sut(query), result);
        test.done();
    },
    'simple values cassandra only': function (test) {
        var query = {
            basic: 'food',
            quantity: 1234.567
        };
        var result = {
            cassandra: {
                basic: 'food',
                quantity: 1234.567
            },
            local: {}
        };
        test.deepEqual(this.sut(query), result);
        test.done();
    },
    'multiconditional': function (test) {
        var query = {
            basic: 'food',
            type: {$in: ['food', 'snacks']},
            'producer.company': 'ABC123',
            name: {
                first: "Yukihiro",
                last: "Matsumoto"
            },
            $or: [
                {qty: {$gt: 100}},
                {price: {$lt: 9.95}}
            ]
        };

        var result = {
            cassandra: {
                basic: 'food',
                type: {$in: ['food', 'snacks']}
            },
            local: {
                'producer.company': 'ABC123',
                name: {
                    first: "Yukihiro",
                    last: "Matsumoto"
                },
                $or: [
                    {qty: {$gt: 100}},
                    {price: {$lt: 9.95}}
                ]
            }
        };

        test.deepEqual(this.sut(query), result);

        test.done();
    },
    'unknown conditional': function (test) {
        var query = {
            something: {$hello: 324}
        };
        var result = {
            cassandra: {},
            local: {
                something: {$hello: 324}
            }
        };

        test.deepEqual(this.sut(query), result);
        test.done();
    }
};


exports['resource.common mapQueryKeyName'] = {
    setUp: function (callback) {
        this.sut = require(path).mapQueryKeyName;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'basic': function (test) {
        var input = {
            firstName: '',
            lastName: ''
        };

        var correct = {
            first_name: '',
            last_name: ''
        };

        var map = {
            firstName: 'first_name',
            lastName: 'last_name'
        };

        test.deepEqual(this.sut(input, map), correct);

        test.done();
    }
};

exports['resource.common calculateWhereQuery'] = {
    setUp: function (callback) {
        this.sut = require(path).constructWhereQuery;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'none where': function (test) {
        var query = {};
        var answer = "";

        test.strictEqual(this.sut(query), answer);
        test.done();
    },
    'single equality': function (test) {
        var query = {type: 'Wave'};
        var answer = " WHERE type = 'Wave'";

        test.strictEqual(this.sut(query), answer);
        test.done();
    },
    'in equality': function (test) {
        var query = {type: {$in: ['Wave', 'Paddle']}};
        var answers = [
            " WHERE type IN ('Wave', 'Paddle')",
            " WHERE type IN ('Paddle', 'Wave')"
        ];
        var result = this.sut(query);

        test.ok(_.indexOf(answers, result) !== -1);

        test.done();
    },
    'multiple equalities': function (test) {
        var query = {type: 'Wave', datasetId: 'fec5ac27-912a-450c-8d64-9843b4f8bdbc'};
        var answers = [
            " WHERE type = 'Wave' AND datasetId = fec5ac27-912a-450c-8d64-9843b4f8bdbc",
            " WHERE datasetId = fec5ac27-912a-450c-8d64-9843b4f8bdbc AND type = 'Wave'"
        ];
        var result = this.sut(query);

        test.ok(_.indexOf(answers, result) !== -1);

        test.done();
    }

};

exports['resource.common valueToCassandraString'] = {
    setUp: function (callback) {
        var self = this;

        var proxyquireOptions = {};
        proxyquireOptions[loggerPath] = {
            error: function (message) {
                self.log(message);
            }
        };

        this.sut = proxyquire(path, proxyquireOptions).valueToCassandraString;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'basic: strings': function (test) {
        test.strictEqual(this.sut("hello"), "'hello'");
        test.strictEqual(this.sut("with 'single' quotes"), "'with ''single'' quotes'");
        test.done();
    },
    'basic: numbers': function (test) {
        test.strictEqual(this.sut(1234), '1234');
        test.strictEqual(this.sut(1234.56789), '1234.56789');
        test.done();
    },
    'basic: uuid': function (test) {
        test.strictEqual(this.sut('fec5ac27-912a-450c-8d64-9843b4f8bdbc'), 'fec5ac27-912a-450c-8d64-9843b4f8bdbc');
        test.done();
    },
    'logs errors on objects and arrays': function (test) {
        test.expect(2);
        this.log = function (message) {
            test.ok(true);
        };

        this.sut({});
        this.sut([]);

        test.done();
    }
};

exports['testQueryOnValue'] = {
    setUp: function (callback) {
        this.sut = require(path).testQueryOnValue;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'equal': function (test) {
        test.strictEqual(this.sut(1234, 1235), false);
        test.strictEqual(this.sut(1234, 1234), true);
        test.strictEqual(this.sut(1234, 1233), false);

        test.strictEqual(this.sut('def', 'efg'), false);
        test.strictEqual(this.sut('def', 'def'), true);
        test.strictEqual(this.sut('def', 'cde'), false);

        test.done();
    },
    '$gt': function (test) {
        test.strictEqual(this.sut(1234, {$gt: 1235}), false);
        test.strictEqual(this.sut(1234, {$gt: 1234}), false);
        test.strictEqual(this.sut(1234, {$gt: 1233}), true);

        test.strictEqual(this.sut('def', {$gt: 'efg'}), false);
        test.strictEqual(this.sut('def', {$gt: 'def'}), false);
        test.strictEqual(this.sut('def', {$gt: 'cde'}), true);

        test.done();
    },
    '$lt': function (test) {
        test.strictEqual(this.sut(1234, {$lt: 1235}), true);
        test.strictEqual(this.sut(1234, {$lt: 1234}), false);
        test.strictEqual(this.sut(1234, {$lt: 1233}), false);

        test.strictEqual(this.sut('def', {$lt: 'efg'}), true);
        test.strictEqual(this.sut('def', {$lt: 'def'}), false);
        test.strictEqual(this.sut('def', {$lt: 'cde'}), false);

        test.done();
    },
    '$gte': function (test) {
        test.strictEqual(this.sut(1234, {$gte: 1235}), false);
        test.strictEqual(this.sut(1234, {$gte: 1234}), true);
        test.strictEqual(this.sut(1234, {$gte: 1233}), true);

        test.strictEqual(this.sut('def', {$gte: 'efg'}), false);
        test.strictEqual(this.sut('def', {$gte: 'def'}), true);
        test.strictEqual(this.sut('def', {$gte: 'cde'}), true);

        test.done();
    },
    '$lte': function (test) {
        test.strictEqual(this.sut(1234, {$lte: 1235}), true);
        test.strictEqual(this.sut(1234, {$lte: 1234}), true);
        test.strictEqual(this.sut(1234, {$lte: 1233}), false);

        test.strictEqual(this.sut('def', {$lte: 'efg'}), true);
        test.strictEqual(this.sut('def', {$lte: 'def'}), true);
        test.strictEqual(this.sut('def', {$lte: 'cde'}), false);

        test.done();
    },
    '$ne': function (test) {
        test.strictEqual(this.sut(1234, {$ne: 1235}), true);
        test.strictEqual(this.sut(1234, {$ne: 1234}), false);
        test.strictEqual(this.sut(1234, {$ne: 1233}), true);

        test.strictEqual(this.sut('def', {$ne: 'efg'}), true);
        test.strictEqual(this.sut('def', {$ne: 'def'}), false);
        test.strictEqual(this.sut('def', {$ne: 'cde'}), true);

        test.done();
    },
    'multiple conditions': function (test) {
        test.strictEqual(this.sut(1234, {$gt: 1233, $lt: 1235}), true);
        test.strictEqual(this.sut(1234, {$lt: 1233, $gt: 1235}), false);
        test.strictEqual(this.sut(1234, {$gt: 1233, $lt: 1235, $ne: 123}), true);

        test.done();
    }
};

exports['extractValue'] = {
    setUp: function (callback) {
        this.sut = require(path).extractValue;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'basic': function (test) {
        var resource = {
            first: {
                second: {
                    third: 1234
                }
            }
        };
        test.strictEqual(this.sut('first.second.third', resource), 1234);
        test.strictEqual(this.sut('first', {first: 1234}), 1234);

        test.done();
    },
    'array and object': function (test) {
        var resource = {
            first: {
                second: {
                    third: []
                }
            }
        };
        test.strictEqual(this.sut('first.second.third', resource), undefined);

        var resource2 = {
            first: {
                second: {
                    third: {}
                }
            }
        };
        test.strictEqual(this.sut('first.second.third', resource2), undefined);

        test.done();
    },
    'too deep': function (test) {
        var resource = {
            first: {
                second: {
                    third: 1234
                }
            }
        };
        test.strictEqual(this.sut('first.second.third.fourth', resource), undefined);
        test.strictEqual(this.sut('first.second.third.fourth.fifth', resource), undefined);

        test.done();
    },
    'non existent key': function (test) {
        var resource = {
            first: {
                second: {
                    third: {
                        fourth: 1234
                    }
                }
            }
        };
        test.strictEqual(this.sut('first.something', resource), undefined);
        test.strictEqual(this.sut('first.something.else', resource), undefined);

        test.done();
    }
};

exports['resource.common testAgainstQuery'] = {
    setUp: function (callback) {
        this.sut = require(path).testAgainstQuery;
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'empty query passes': function (test) {
        test.strictEqual(this.sut({}, {}), true);
        test.done();
    },
    'basic': function (test) {

        var resource = {
            first: 1234,
            second: {
                third: {
                    a: 'a',
                    b: 'b',
                    c: 'c'
                }
            }
        };
        var queryA = {
            first: {$gt: 1000, $lt: 5000},
            'second.third.a': 'a'
        };

        test.strictEqual(this.sut(resource, queryA), true);

        var queryB = {
            first: {$gt: 1000, $lt: 5000},
            'second.third.b': 'a'
        };

        test.strictEqual(this.sut(resource, queryB), false);

        test.done();
    }
};

exports['resource.common setupOrderBy'] = {
    setUp: function (callback) {
        var proxyquireOptions = {};
        proxyquireOptions[loggerPath] = {
            error: function (message) {
                // do nothing.
            }
        };

        this.sut = proxyquire(path, proxyquireOptions).setupOrderBy;


        this.testObjects = [
            {a: 5},
            {a: 1},
            {a: 2}
        ];
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'basic no ordering': function (test) {
        test.expect(this.testObjects.length * 2);


        var self = this;
        // Test with empty (default no) orderBy
        var index = 0;
        var t = this.sut({}, function (actual) {
            test.deepEqual(actual, self.testObjects[index++]);
        });
        _.each(this.testObjects, t.newRow);


        // Test with explicit no orderBy
        var index2 = 0;
        var u = this.sut({a: 0}, function (actual) {
            test.deepEqual(actual, self.testObjects[index2++]);
        });
        _.each(this.testObjects, u.newRow);

        // Important: should pass without a call to test done: this means that
        // it does it's processing without buffering the values.

        test.done();
    },
    'basic ascending ordering': function (test) {
        var expected = [
            {a: 1},
            {a: 2},
            {a: 5}
        ];

        test.expect(this.testObjects.length);

        var index = 0;
        var t = this.sut({a: 1}, function (actual) {
            test.deepEqual(actual, expected[index++]);
        });

        _.each(this.testObjects, t.newRow);
        t.done();

        test.done();
    },
    'basic descending ordering': function (test) {
        var expected = [
            {a: 5},
            {a: 2},
            {a: 1}
        ];

        test.expect(this.testObjects.length);

        var index = 0;
        var t = this.sut({a: -1}, function (actual) {
            test.deepEqual(actual, expected[index++]);
        });

        _.each(this.testObjects, t.newRow);
        t.done();

        test.done();
    },
    'non unitary ordering value': function (test) {
        var expected = [
            {a: 1},
            {a: 2},
            {a: 5}
        ];

        test.expect(this.testObjects.length);

        var index = 0;
        var t = this.sut({a: 125325032.50}, function (actual) {
            test.deepEqual(actual, expected[index++]);
        });

        _.each(this.testObjects, t.newRow);
        t.done();

        test.done();
    },
    'multiple keys': function (test) {
        test.expect(this.testObjects.length * 2);

        var self = this;
        var index = 0;
        var t = this.sut({a: 1, b: -1}, function (actual) {
            test.deepEqual(actual, self.testObjects[index++]);
        });
        _.each(this.testObjects, t.newRow);

        var expected = [
            {a: 1},
            {a: 2},
            {a: 5}
        ];
        var index2 = 0;
        var t2 = this.sut({a: 1, b: 0}, function (actual) {
            test.deepEqual(actual, expected[index2++]);
        });
        _.each(this.testObjects, t2.newRow);
        t2.done();

        test.done();
    }
};


exports['resource.common setupSkipAndLimit'] = {
    setUp: function (callback) {
        this.sut = require(path).setupSkipAndLimit;
        this.testObjects = [
            {a: 1},
            {a: 2},
            {a: 3},
            {a: 4},
            {a: 5}
        ];
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'no skip or limit': function (test) {

        var index = 0;
        var expected = this.testObjects;
        test.expect(expected.length);

        var postQueue = {
            push: function (e) {
                test.deepEqual(e, expected[index++]);
            }
        };

        var t = this.sut(null, null, postQueue);
        _.each(this.testObjects, t);

        test.done();
    },
    'skip': function (test) {

        var index = 0;
        var expected = [
            {a: 4},
            {a: 5}
        ];

        test.expect(expected.length);

        var postQueue = {
            push: function (e) {
                test.deepEqual(e, expected[index++]);
            }
        };

        var t = this.sut(3, null, postQueue);
        _.each(this.testObjects, t);

        test.done();
    },
    'limit': function (test) {

        var index = 0;
        var expected = [
            {a: 1},
            {a: 2}
        ];

        test.expect(expected.length);

        var postQueue = {
            push: function (e) {
                test.deepEqual(e, expected[index++]);
            }
        };

        var t = this.sut(null, 2, postQueue);
        _.each(this.testObjects, t);

        test.done();
    },
    'skip and limit': function (test) {

        var index = 0;
        var expected = [
            {a: 3},
            {a: 4}
        ];

        test.expect(expected.length);

        var postQueue = {
            push: function (e) {
                test.deepEqual(e, expected[index++]);
            }
        };

        var t = this.sut(2, 2, postQueue);
        _.each(this.testObjects, t);

        test.done();
    }
};

exports['resource.common queryTailPipeline'] = {
    setUp: function (callback) {
        this.sut = require(path).queryTailPipeline;
        this.testObjects = [
            {a: 5},
            {a: 1},
            {a: 2},
            {a: 3},
            {a: 4}
        ];
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    'basic': function (test) {
        var testObjects = this.testObjects;
        test.expect(testObjects.length);

        var index = 0;

        function expandFunction(expandParameters, e, callback) {
            callback(e);
        }

        function rowFunction(element) {
            test.deepEqual(element, testObjects[index++]);
        }

        function doneFunction() {
            test.done();
        }

        var pipeline = this.sut({}, expandFunction, rowFunction, doneFunction);

        _.each(testObjects, pipeline.row);
        pipeline.done();
    },
    'multi conditional': function (test) {
        var testObjects = this.testObjects;
        var testExpected = [
            {a: 2},
            {a: 3}
        ];
        test.expect(testExpected.length);

        var index = 0;

        function expandFunction(expandParameters, e, callback) {
            callback(e);
        }

        function rowFunction(element) {
            test.deepEqual(element, testExpected[index++]);
        }

        function doneFunction() {
            test.done();
        }

        var parameters = {
            $skip: 1,
            $limit: 2,
            $orderBy: {a: 1}
        };
        var pipeline = this.sut(parameters, expandFunction, rowFunction, doneFunction);

        _.each(testObjects, pipeline.row);
        pipeline.done();
    }
};














































