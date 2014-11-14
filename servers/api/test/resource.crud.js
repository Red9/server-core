"use strict";

var _ = require('underscore')._;
var rewire = require('rewire');

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../resources/resource.crud';

var cassandraMock = {
    execute: function (options) {
        options.callback(null);
    }
};


var resourceDescription = {
    tableName: 'testTable',
    mapping: [
        {
            cassandraKey: 'id',
            cassandraType: 'uuid',
            jsKey: 'id',
            jsType: 'string'
        },
        {
            cassandraKey: 'startTime',
            cassandraType: 'int',
            jsKey: 'startTime',
            jsType: 'int'
        }
    ],
    checkResource: function (newResource, callback) {
        callback(null, newResource);
    },
    expand: function (options, resource, callback) {
        if (resource.id === 'errorId') {
            callback(new Error());
            return;
        }


        if (!_.isUndefined(options) && options.indexOf('ghi') !== -1) {
            resource.ghi = 'hello';
        }
        callback(null, resource);
    }
};

describe('create', function () {
    var t = rewire(requirePath);
    t.__set__('cassandra', cassandraMock);
    var sut = t.create;

    it('can successfully create an object', function (done) {
        var newResource = {
            startTime: 1234
        };

        sut(resourceDescription, newResource, function (err, createdResource) {
            expect(err).to.be.null();
            expect(createdResource).to.include('createTime').include('id').deep.include(newResource);
            done();
        });
    });

    it('does not change id or createTime on deep migrate', function (done) {
        var newResource = {
            id: '86e37dd9-2b1a-497d-a037-092b222928c6',
            createTime: 124544,
            startTime: 1234
        };

        sut(resourceDescription, newResource, function (err, createdResource) {
            expect(err).to.be.null();
            expect(createdResource).to.deep.equal(newResource);
            done();
        }, true);
    });

    it('checks the resource', function (done) {
        var newResource = {
            startTime: 1234
        };

        var resourceDescriptionClone = _.clone(resourceDescription);
        resourceDescriptionClone.checkResource = function (newResource, callback) {
            callback(new Error());
        };

        sut(resourceDescriptionClone, newResource, function (err, createdResource) {
            expect(err).to.not.be.null();
            done();
        });
    });
});

describe('find', function () {
    var t = rewire(requirePath);


    var results = [];
    var cassandraError = null;
    var cassandraMockFind = {
        execute: function (options) {
            _.each(results, options.rowCallback);
            options.callback(cassandraError);
        }
    };
    t.__set__('cassandra', cassandraMockFind);
    var sut = t.find;


    it('works with a row callback and without an options parameter', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999},
            {id: 'xyz', startTime: 6666}
        ];

        var resultsIndex = 0;

        sut(resourceDescription, {},
            function (item) {
                expect(item).to.deep.equal(results[resultsIndex++]);
            },
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('works with an options parameter and without a row callback', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999}
        ];

        sut(resourceDescription, {}, {},
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('works with all parameters', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999}
        ];

        var resultsIndex = 0;

        sut(resourceDescription, {}, {$expand: ['ghi']},
            function (item) {
                expect(item).to.include('ghi').and.deep.include(results[resultsIndex++]);
            },
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('works without options parameter or a row callback', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999}
        ];

        sut(resourceDescription, {},
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('works with with no results', function (done) {
        cassandraError = null;
        results = [];

        sut(resourceDescription, {},
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('handles errors in expand', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'errorId', startTime: 9999}
        ];

        sut(resourceDescription, {},
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(results.length);
                done();
            });
    });

    it('filters based on local query', function (done) {
        cassandraError = null;
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999},
            {id: 'xyz', startTime: 6666}
        ];

        var resultsIndex = 0;
        var expected = [results[1]];

        // Assumes that a $gt query must be done locally

        var query = {startTime: {$gt: 6666}};

        sut(resourceDescription, query,
            function (item) {
                expect(item).to.deep.equal(expected[resultsIndex++]);
            },
            function (err, rowCount) {
                expect(err).to.be.null();
                expect(rowCount).to.be.equal(expected.length);
                done();
            });
    });

    it('handles cassandra error', function (done) {
        cassandraError = new Error();
        results = [
            {id: 'abc', startTime: 1234},
            {id: 'def', startTime: 9999}
        ];

        sut(resourceDescription, {},
            function (err, rowCount) {
                expect(err).to.not.be.null();
                done();
            });
    });
});


describe('update', function () {
    var t = rewire(requirePath);
    t.__set__('cassandra', cassandraMock);
    var sut = t.update;

    it('has basic functionality', function (done) {
        var original = {
            id: 'c4d0bd57-e636-48f5-b9eb-d6f1744438f9',
            startTime: 1234
        };
        var update = {
            startTime: 9999
        };

        sut(resourceDescription, original, update, function (err, result) {
            expect(err).to.be.null();
            expect(result).to.include('id').include(update);
            done();
        });
    });

    it('has error on empty update', function (done) {
        var original = {};
        var update = {};

        sut(resourceDescription, original, update, function (err, result) {
            expect(err).to.include('isBoom').and.not.be.null();
            done();
        });
    });

    it('returns errors when check fails', function (done) {
        var original = {
            id: 'c4d0bd57-e636-48f5-b9eb-d6f1744438f9',
            startTime: 1234
        };
        var update = {
            startTime: 9999
        };

        var resourceDescriptionClone = _.clone(resourceDescription);
        resourceDescriptionClone.checkResource = function (newResource, callback) {
            callback(new Error());
        };

        sut(resourceDescriptionClone, original, update, function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });
});


describe('delete', function () {
    var t = rewire(requirePath);
    t.__set__('cassandra', cassandraMock);
    var sut = t.delete;

    it('has basic functionality', function (done) {
        sut(resourceDescription, '123', function (err) {
            expect(err).to.be.null();
            done();
        });
    });
});