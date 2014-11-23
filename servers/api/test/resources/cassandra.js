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

var requirePath = '../../resources/cassandra';

var nconfMock = {
    get: function (key) {
        var config = {
            cassandraHosts: ['localhost'],
            cassandraKeyspace: 'test',
            cassandraUsername: 'cassandra',
            cassandraPassword: 'cassandra'
        };
        return config[key];
    }
};


describe('init', function () {
    var sut = rewire(requirePath);
    sut.__set__('nconf', nconfMock);

    var error = false;
    var cassandraDriverMock = {
        Client: function () {
            return {
                connect: function (callback) {
                    if (error) {
                        callback(new Error());
                    } else {
                        callback();
                    }
                }
            };
        },
        auth: {
            PlainTextAuthProvider: function () {
            }
        }
    };

    sut.__set__('cassandraDriver', cassandraDriverMock);

    it('works without error', function (done) {
        error = false;

        sut.init(function (err) {
            expect(err).to.be.null();
            done();
        });
    });

    it('wraps a boom error on error', function (done) {
        error = true;

        sut.init(function (err) {
            expect(err).to.include('isBoom').and.to.not.be.null();
            done();
        });
    });
});

describe('execute', function () {
    var sut = rewire(requirePath);
    var error = false;
    var cassandraMock = {
        eachRow: function (query, parameters, queryOptions, rowCallback, doneCallback) {
            rowCallback({});
            if (error) {
                doneCallback(new Error());
            } else {
                doneCallback(null);
            }
        }
    };
    sut.__set__('cassandra', cassandraMock);

    it('works', function (done) {
        error = false;
        var options = {
            query: '',
            rowCallback: function (data) {
            },
            callback: function (err) {
                expect(err).to.be.null();
                done();
            },
            parameters: [],
            hints: []
        };

        sut.execute(options);
    });

    it('works with default values and wraps error', function (done) {
        error = true;
        var options = {
            query: '',
            callback: function (err) {
                expect(err).to.include('isBoom').and.to.not.be.null();
                done();
            }
        };
        sut.execute(options);
    });
});

describe('getDatasetCount', function () {
    var sut = rewire(requirePath);
    var countResult = {
        rows: [
            {
                count: {
                    low: 5
                }
            }
        ]
    };
    var error = false;
    var cassandraMock = {
        execute: function (query, parameters, queryOptions, doneCallback) {
            if (error) {
                doneCallback(new Error());
            } else {
                doneCallback(null, countResult);
            }
        }
    };
    sut.__set__('cassandra', cassandraMock);

    it('works', function (done) {
        error = false;
        sut.getDatasetCount('123', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('handles errors', function (done) {
        error = true;
        sut.getDatasetCount('123', function (err, result) {
            expect(err).to.include('isBoom').and.to.not.be.null();
            done();
        });
    });
});






















