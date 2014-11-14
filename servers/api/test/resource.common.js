"use strict";

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../resources/resource.common';
var sut = require(requirePath);

describe('generateUUID', function () {
    var uuid4Regex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/;

    it('has basic functionality', function (done) {
        // Repeat a few times, just to make sure
        expect(sut.generateUUID()).to.match(uuid4Regex);
        expect(sut.generateUUID()).to.match(uuid4Regex);
        expect(sut.generateUUID()).to.match(uuid4Regex);

        done();
    });
});

describe('createResourceQuery', function () {
    var tableName = 'event';
    var mapping = [
        {
            cassandraKey: 'id',
            cassandraType: 'uuid',
            jsKey: 'id',
            jsType: 'string'
        },
        {
            cassandraKey: 'start_time',
            cassandraType: 'timestamp',
            jsKey: 'startTime',
            jsType: 'timestamp'

        },
        {
            cassandraKey: 'source',
            cassandraType: 'varchar',
            jsKey: 'source',
            jsType: 'object'
        },
        {
            cassandraKey: 'abc',
            cassandraType: 'varchar',
            jsKey: 'abc',
            jsType: 'string'
        }
    ];

    it('has basic functionality', function (done) {
        var newResource = {
            id: '1234',
            startTime: 9999,
            source: {
                key: 'value'
            }
        };

        var expected = {
            query: 'INSERT INTO event (id,start_time,source) VALUES (?,?,?)',
            parameters: [newResource.id, newResource.startTime, JSON.stringify(newResource.source)],
            hints: ['uuid', 'timestamp', 'varchar']
        };

        expect(sut.createResourceQuery(tableName, mapping, newResource))
            .to.deep.equal(expected);

        done();
    });
});


describe('createUpdateQuery', function () {
    var tableName = 'event';
    var mapping = [
        {
            cassandraKey: 'id',
            cassandraType: 'uuid',
            jsKey: 'id',
            jsType: 'string'
        },
        {
            cassandraKey: 'start_time',
            cassandraType: 'timestamp',
            jsKey: 'startTime',
            jsType: 'timestamp'

        },
        {
            cassandraKey: 'source',
            cassandraType: 'varchar',
            jsKey: 'source',
            jsType: 'object'
        },
    ];
    it('has basic functionality', function (done) {
        var id = '736845237';
        var updatedResource = {
            startTime: 456,
            source: {}
        };

        var expected = {
            query: 'UPDATE event SET start_time=?,source=? WHERE id=' + id,
            parameters: [456, '{}'],
            hints: ['timestamp', 'varchar']
        };

        expect(sut.createUpdateQuery(tableName, mapping, id, updatedResource))
            .to.deep.equal(expected);

        done();
    });
});


describe('createDeleteQuery', function () {
    it('has basic functionality', function (done) {
        var id = '58485eab-cfee-4a3b-ab13-431be4e8d9bf';
        expect(sut.createDeleteQuery('event', id))
            .equals('DELETE FROM event WHERE id = ' + id);
        done();
    });
});


describe('convertJSTypeToCassandraType', function () {
    it('stringifies Objects and Arrays', function (done) {
        expect(sut.convertJSTypeToCassandraType({a: 123}, 'object', 'varchar'))
            .to.equal('{"a":123}');
        expect(sut.convertJSTypeToCassandraType([1, 2, 3], 'array', 'varchar'))
            .to.equal('[1,2,3]');
        done();
    });

    it('returns normal values unchanged', function (done) {
        expect(sut.convertJSTypeToCassandraType('hello', 'string', 'varchar'))
            .to.equal('hello');
        done();
    });

    it('handles sets, lists, and maps correctly', function (done) {
        expect(sut.convertJSTypeToCassandraType([1, 2, 3], 'array', 'set<int>'))
            .to.deep.equal([1, 2, 3]);

        expect(sut.convertJSTypeToCassandraType({}, 'object', 'map<text, text>'))
            .to.deep.equal({});

        done();
    });

});





















