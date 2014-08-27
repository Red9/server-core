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
