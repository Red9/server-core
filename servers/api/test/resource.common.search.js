"use strict";

var rewire = require('rewire');

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../resources/resource.common.search';

var sut = require(requirePath);

describe('divideQueries', function () {

    it('returns all results on empty query', function (done) {
        var query = {};
        var expected = {
            cassandra: [],
            local: {}
        };
        expect(sut.divideQueries(query)).to.deep.equal(expected);
        done();
    });

    it('puts equality conditions in the cassandra query', function (done) {
        var query = {
            basic: 'food',
            quantity: 1234.567
        };
        var expected = {
            cassandra: [
                {basic: 'food'},
                {quantity: 1234.567}
            ],
            local: {}
        };
        expect(sut.divideQueries(query)).to.deep.equal(expected);
        done();
    });

    it('does $in', function (done) {
        var query = {
            basic: {$in: ['a', 'b', 'c']},
        };
        var expected = {
            cassandra: [query],
            local: {}
        };

        expect(sut.divideQueries(query)).to.deep.equal(expected);

        done();
    });

    it('puts OR in local', function (done) {
        var query = {
            $or: []
        };
        var expected = {
            cassandra: [],
            local: query
        };
        expect(sut.divideQueries(query)).to.deep.equal(expected);

        done();
    });

    it('works with multiple conditions', function (done) {
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

        var expected = {
            cassandra: [
                {basic: 'food'},
                {type: {$in: ['food', 'snacks']}}
            ],
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
        expect(sut.divideQueries(query)).to.deep.equal(expected);
        done();
    });


    it('correctly flattens explicit AND', function (done) {
        // Local
        var queryA = {
            $and: [
                {key: {$gt: 123}},
                {key: {$lt: 999}},
            ]
        };

        var expectedA = {
            cassandra: [],
            local: {
                key: {
                    $gt: 123,
                    $lt: 999
                }
            }
        };

        // Somehow, this works. I'm not sure why.
        expect(sut.divideQueries(queryA)).to.deep.equal(expectedA);


        // Cassandra
        var queryB = {
            $and: [
                {keyA: 'ABC'},
                {keyB: 123},
            ]
        };

        var expectedB = {
            cassandra: [{keyA: 'ABC'}, {keyB: 123}],
            local: {}
        };

        expect(sut.divideQueries(queryB)).to.deep.equal(expectedB);

        done();
    });
});


describe('constructWhereQueryWithParameters', function () {
    var mapping = [
        {
            cassandraKey: 'type',
            cassandraType: 'varchar',
            jsKey: 'type',
            jsType: 'varchar'
        },
        {
            cassandraKey: 'dataset',
            cassandraType: 'uuid',
            jsKey: 'datasetId',
            jsType: 'string'
        },
        {
            cassandraKey: 'tags',
            cassandraType: 'set<text>',
            jsKey: 'tags',
            jsType: 'array'
        },
        {
            cassandraKey: 'number',
            cassandraType: 'int',
            jsKey: 'number',
            jsType: 'number'
        },
        {
            cassandraKey: 'bool',
            cassandraType: 'boolean',
            jsKey: 'bool',
            jsType: 'boolean'
        }
    ];

    var tableName = 'testtable';

    it('should not have a WHERE when no constraints are used', function (done) {
        var query = [];

        var expected = {
            query: 'SELECT * FROM ' + tableName + ' ALLOW FILTERING',
            parameters: [],
            hints: []
        };

        expect(sut.constructWhereQueryWithParameters(tableName, mapping, query))
            .to.deep.equal(expected);
        done();
    });

    it('should work with a single equality for multiple types', function (done) {
        var queryA = [{type: 'Wave'}];

        var expectedA = {
            query: 'SELECT * FROM ' + tableName + ' WHERE type=? ALLOW FILTERING',
            parameters: ['Wave'],
            hints: ['varchar']
        };
        expect(sut.constructWhereQueryWithParameters(tableName, mapping, queryA))
            .to.deep.equal(expectedA);

        var queryB = [{number: 123}];

        var expectedB = {
            query: 'SELECT * FROM ' + tableName + ' WHERE number=? ALLOW FILTERING',
            parameters: [123],
            hints: ['int']
        };
        expect(sut.constructWhereQueryWithParameters(tableName, mapping, queryB))
            .to.deep.equal(expectedB);


        var queryC = [{bool: true}];

        var expectedC = {
            query: 'SELECT * FROM ' + tableName + ' WHERE bool=? ALLOW FILTERING',
            parameters: [true],
            hints: ['boolean']
        };
        expect(sut.constructWhereQueryWithParameters(tableName, mapping, queryC))
            .to.deep.equal(expectedC);

        done();
    });

    it('works with $IN queries', function (done) {
        var query = [{type: {$in: ['Wave', 'Paddle']}}];

        var expected = {
            query: 'SELECT * FROM ' + tableName + ' WHERE type IN (?,?) ALLOW FILTERING',
            parameters: ['Wave', 'Paddle'],
            hints: ['varchar', 'varchar']
        };

        expect(sut.constructWhereQueryWithParameters(tableName, mapping, query))
            .to.deep.equal(expected);

        done();
    });

    it('works with multilpe equalities (AND)', function (done) {
        var query = [{type: 'Wave'}, {datasetId: 'fec5ac27-912a-450c-8d64-9843b4f8bdbc'}];

        var expected = {
            query: 'SELECT * FROM ' + tableName + ' WHERE type=? AND dataset=? ALLOW FILTERING',
            parameters: ['Wave', 'fec5ac27-912a-450c-8d64-9843b4f8bdbc'],
            hints: ['varchar', 'uuid']
        };

        expect(sut.constructWhereQueryWithParameters(tableName, mapping, query))
            .to.deep.equal(expected);
        done();
    });

    it('works with a set type', function (done) {
        var query = [{tags: 'hello'}];
        var expected = {
            query: 'SELECT * FROM ' + tableName + ' WHERE tags CONTAINS ? ALLOW FILTERING',
            parameters: ['hello'],
            hints: ['text']
        };

        expect(sut.constructWhereQueryWithParameters(tableName, mapping, query))
            .to.deep.equal(expected);

        done();
    });

    it('throws errors on bad conditions', function (done) {
        // Throws error on invalid query
        var queryA = [{key: {}}];

        function wrapperA() {
            sut.constructWhereQueryWithParameters(tableName, mapping, queryA);
        }

        expect(wrapperA).to.throw(Error);

        /////////////////////////

        var queryB = [{number: []}];

        function wrapperB() {
            sut.constructWhereQueryWithParameters(tableName, mapping, queryB);
        }

        expect(wrapperB).to.throw(Error);

        /////////////////////////

        var queryC = [{number: null}];

        function wrapperC() {
            sut.constructWhereQueryWithParameters(tableName, mapping, queryC);
        }

        expect(wrapperC).to.throw(Error);

        done();
    });
});

describe('testSimpleQuery', function () {
    var sutFunction = rewire(requirePath).__get__('testSimpleQuery');
    it('works with equality testing', function (done) {
        expect(sutFunction(1234, 1235)).to.equal(false);
        expect(sutFunction(1234, 1234)).to.equal(true);
        expect(sutFunction(1234, 1233)).to.equal(false);

        expect(sutFunction('def', 'efg')).to.equal(false);
        expect(sutFunction('def', 'def')).to.equal(true);
        expect(sutFunction('def', 'cde')).to.equal(false);

        done();
    });

    it('works with $gt testing', function (done) {
        expect(sutFunction(1234, {$gt: 1235})).to.equal(false);
        expect(sutFunction(1234, {$gt: 1234})).to.equal(false);
        expect(sutFunction(1234, {$gt: 1233})).to.equal(true);

        expect(sutFunction('def', {$gt: 'efg'})).to.equal(false);
        expect(sutFunction('def', {$gt: 'def'})).to.equal(false);
        expect(sutFunction('def', {$gt: 'cde'})).to.equal(true);

        done();
    });

    it('works with $lt testing', function (done) {
        expect(sutFunction(1234, {$lt: 1235})).to.equal(true);
        expect(sutFunction(1234, {$lt: 1234})).to.equal(false);
        expect(sutFunction(1234, {$lt: 1233})).to.equal(false);

        expect(sutFunction('def', {$lt: 'efg'})).to.equal(true);
        expect(sutFunction('def', {$lt: 'def'})).to.equal(false);
        expect(sutFunction('def', {$lt: 'cde'})).to.equal(false);

        done();
    });

    it('works with $gte testing', function (done) {
        expect(sutFunction(1234, {$gte: 1235})).to.equal(false);
        expect(sutFunction(1234, {$gte: 1234})).to.equal(true);
        expect(sutFunction(1234, {$gte: 1233})).to.equal(true);

        expect(sutFunction('def', {$gte: 'efg'})).to.equal(false);
        expect(sutFunction('def', {$gte: 'def'})).to.equal(true);
        expect(sutFunction('def', {$gte: 'cde'})).to.equal(true);

        done();
    });

    it('works with $lte testing', function (done) {
        expect(sutFunction(1234, {$lte: 1235})).to.equal(true);
        expect(sutFunction(1234, {$lte: 1234})).to.equal(true);
        expect(sutFunction(1234, {$lte: 1233})).to.equal(false);

        expect(sutFunction('def', {$lte: 'efg'})).to.equal(true);
        expect(sutFunction('def', {$lte: 'def'})).to.equal(true);
        expect(sutFunction('def', {$lte: 'cde'})).to.equal(false);

        done();
    });

    it('works with $ne testing', function (done) {
        expect(sutFunction(1234, {$ne: 1235})).to.equal(true);
        expect(sutFunction(1234, {$ne: 1234})).to.equal(false);
        expect(sutFunction(1234, {$ne: 1233})).to.equal(true);

        expect(sutFunction('def', {$ne: 'efg'})).to.equal(true);
        expect(sutFunction('def', {$ne: 'def'})).to.equal(false);
        expect(sutFunction('def', {$ne: 'cde'})).to.equal(true);

        done();
    });

    it('works with multiple conditions', function (done) {
        expect(sutFunction(1234, {$gt: 9999, $lt: 9999})).to.equal(false);
        expect(sutFunction(1234, {$gt: 1000, $lt: 1000})).to.equal(false);
        expect(sutFunction(1234, {$gt: 1, $lt: 9999, $gte: 1, $lte: 1})).to.equal(false);
        expect(sutFunction(1234, {$gt: 1000, $lt: 9999})).to.equal(true);

        done();
    });

    it('rejects unknown keys', function (done) {
        expect(sutFunction(1234, {hi: 1234})).to.equal(false);
        done();
    });
});

describe('testQueryPart', function () {
    var sutFunction = rewire(requirePath).__get__('testQueryPart');
    var resource = {
        number: 1234,
        string: 'hello'
    };

    it('handles simple cases', function (done) {
        expect(sutFunction(resource, 'number', 1234)).to.equal(true);
        expect(sutFunction(resource, 'string', 1234)).to.equal(false);

        expect(sutFunction(resource, 'number', {$gt: 123})).to.equal(true);
        expect(sutFunction(resource, 'string', {$ne: 'world'})).to.equal(true);

        done();
    });

    it('handles the OR case', function (done) {
        expect(sutFunction(resource, '$or', [{number: {$gt: 123}}, {number: {$lt: 456}}])).to.equal(true);
        expect(sutFunction(resource, '$or', [{number: {$gt: 9999}}, {number: {$lt: 456}}])).to.equal(false);

        // Different keys, first test fails.
        expect(sutFunction(resource, '$or', [{number: {$gt: 9999}}, {string: 'hello'}])).to.equal(true);

        done();
    });

    it('handles the AND case', function (done) {
        expect(sutFunction(resource, '$and', [{number: {$gt: 123}}, {number: {$lt: 9999}}])).to.equal(true);
        expect(sutFunction(resource, '$and', [{number: {$gt: 123}}, {number: {$lt: 456}}])).to.equal(false);

        // Different keys, first test fails.
        expect(sutFunction(resource, '$and', [{number: {$gt: 9999}}, {string: 'hello'}])).to.equal(false);

        done();
    });


    it('handles various error cases', function (done) {

        // Key is not valid for value type
        expect(sutFunction(resource, 'number', [{$gt: 123}, {$lt: 456}])).to.equal(false);

        // Empty Array
        expect(sutFunction(resource, '$and', [])).to.equal(false);

        done();
    });
});

describe('extractValue', function () {
    var sutFunction = rewire(requirePath).__get__('extractValue');
    var resource = {
        first: {
            second: {
                third: 1234
            }
        },
        simple: 'hello'
    };

    it('works for valid cases', function (done) {
        // Simple case
        expect(sutFunction('simple', resource)).to.equal(resource.simple);

        // Nested values
        expect(sutFunction('first.second.third', resource)).to.equal(resource.first.second.third);
        done();
    });

    it('handles various error cases', function (done) {
        // Too deeeeeep
        expect(sutFunction('first.second.third.fourth.fifith', resource)).to.be.undefined();

        // Non existant
        expect(sutFunction('first.wat.second.third.fourth.fifith', resource)).to.be.undefined();

        // Does not return a complex result
        expect(sutFunction('first', resource)).to.be.undefined();

        done();
    });

});


describe('testAgainstQuery', function () {
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

    it('works for basic cases', function (done) {
        var queryA = {
            first: {$gt: 1000, $lt: 5000},
            'second.third.a': 'a'
        };
        expect(sut.testAgainstQuery(resource, queryA)).to.be.true();

        var queryB = {
            first: {$gt: 1000, $lt: 5000},
            'second.third.b': 'a'
        };
        expect(sut.testAgainstQuery(resource, queryB)).to.be.false();

        done();
    });
});

describe('convertCassandraTypeToJSType', function () {
    var sutFunction = rewire(requirePath).__get__('convertCassandraTypeToJSType');
    it('parses as JSON when needed', function (done) {
        expect(sutFunction('{"a":123}', 'object', 'varchar'))
            .to.deep.equal({a: 123});

        // And returns empty object on unparsable JSON
        expect(sutFunction(123, 'object', 'varchar'))
            .to.deep.equal({});
        expect(sutFunction('{aaa', 'object', 'varchar'))
            .to.deep.equal({});


        done();
    });

    it('works for Cassandra maps, sets, and lists', function (done) {
        expect(sutFunction({a: 123}, 'object', 'map<text, text>'))
            .to.deep.equal({a: 123});

        expect(sutFunction(['hello', 'world'], 'array', 'set<text>'))
            .to.deep.equal(['hello', 'world']);

        expect(sutFunction(null, 'array', 'set<text>'))
            .to.deep.equal([]);

        done();
    });

    it('returns dates in the correct format', function (done) {
        var date = new Date();
        expect(sutFunction(date, 'timestamp', 'timestamp'))
            .to.equal(date.getTime());

        expect(sutFunction(null, 'timestamp', 'timestamp'))
            .to.equal(null);

        done();
    });

    it('returns simple types as simple types', function (done) {
        expect(sutFunction(123, 'number', 'int'))
            .to.equal(123);

        expect(sutFunction('abc', 'string', 'varchar'))
            .to.equal('abc');

        done();
    });
});


describe('mapToResource', function () {
    var mapping = [
        {
            cassandraKey: 'type',
            cassandraType: 'varchar',
            jsKey: 'type',
            jsType: 'varchar'
        },
        {
            cassandraKey: 'dataset',
            cassandraType: 'uuid',
            jsKey: 'datasetId',
            jsType: 'string'
        },
        {
            cassandraKey: 'tags',
            cassandraType: 'set<text>',
            jsKey: 'tags',
            jsType: 'array'
        },
        {
            cassandraKey: 'number',
            cassandraType: 'int',
            jsKey: 'number',
            jsType: 'number'
        },
        {
            cassandraKey: 'bool',
            cassandraType: 'boolean',
            jsKey: 'bool',
            jsType: 'boolean'
        }
    ];


    it('has basic functionality', function (done) {
        var cassandra = {
            type: 'hello',
            tags: null
        };

        var expected = {
            type: 'hello',
            tags: []
        };

        expect(sut.mapToResource(mapping, cassandra))
            .to.deep.equal(expected);

        done();
    });
});







































































































