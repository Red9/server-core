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

var requirePath = '../../resources/resource.common.collection.set';

describe('createAddQuery', function () {
    var sutFunction = rewire(requirePath).__get__('createUpdateQuery');

    var tableName = 'table';
    var id = '85ab100f-1497-4c3f-8c74-e5048dd1f855';

    var cassandraKey = 'tags';
    var cassandraType = 'set<text>';

    it('can add elements', function (done) {
        var expected = {
            query: 'UPDATE ' + tableName + ' SET ' + cassandraKey + ' = ' + cassandraKey + " + {'abc','def'} WHERE id=" + id,
            parameters: [],
            hints: []
        };

        expect(sutFunction(tableName, id, 'add', cassandraKey, cassandraType, ['abc', 'def']))
            .to.deep.equal(expected);

        done();
    });

    it('can remove elements', function (done) {
        var expected = {
            query: 'UPDATE ' + tableName + ' SET ' + cassandraKey + ' = ' + cassandraKey + " - {'def'} WHERE id=" + id,
            parameters: [],
            hints: []
        };

        expect(sutFunction(tableName, id, 'remove', cassandraKey, cassandraType, ['def']))
            .to.deep.equal(expected);

        done();
    });
});

describe('add and remove', function () {
    var sut = rewire(requirePath);
    var cassandraMock = {
        execute: function (parameters) {
            parameters.callback(null);
        }
    };

    sut.__set__('cassandra', cassandraMock);

    var resourceDescription = {
        tableName: 'something',
        mapping: [
            {
                cassandraKey: 'type',
                cassandraType: 'varchar',
                jsKey: 'type',
                jsType: 'varchar'
            },
            {
                cassandraKey: 'tags',
                cassandraType: 'set<text>',
                jsKey: 'tags',
                jsType: 'array'
            }
        ]
    };

    it('can add', function (done) {
        sut.add(resourceDescription, '123', 'tags', ['hello'], function (err) {
            expect(err).to.be.null();
            done();
        });
    });

    it('can remove', function (done) {
        sut.remove(resourceDescription, '123', 'tags', ['hello'], function (err) {
            expect(err).to.be.null();
            done();
        });
    });


});


