'use strict';

var rewire = require('rewire');

var async = require('async');

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../../support/validators.js';

describe('id', function () {
    var sut = require(requirePath).id;

    it('validates id correctly', function (done) {
        sut.validate(123, function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('validates converts numerical strings', function (done) {
        sut.validate('1234', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('rejects UUIDs', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bc7',
            function (err, result) {
                expect(err).to.not.be.null();
                done();
            });
    });

    it('rejects invalid strings', function (done) {
        sut.validate('one', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });
});

describe('idCSV', function () {
    var sut = require(requirePath).idCSV;

    it('validates single id correctly', function (done) {
        sut.validate('1234', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('validates two ids correctly', function (done) {
        sut.validate('1234,999', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('validates three ids correctly', function (done) {
        sut.validate('1,2,3', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('rejects invalid items', function (done) {
        sut.validate('1,2,abc', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });

    it('rejects invalid seperators', function (done) {
        sut.validate('1;2;3', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });

});

describe('multiArray', function () {

    var single = require(requirePath).id; // just something...
    var sut = require(requirePath).multiArray(single);

    it('works on single', function (done) {
        var value = 1234;
        sut.validate(value, function (err, result) {
            expect(err).to.be.null();
            expect(result).to.equal(value);
            done();
        });
    });

    it('works on multiple', function (done) {
        var values = [
            987,
            123
        ];
        sut.validate(values, function (err, result) {
            expect(err).to.be.null();
            expect(result).to.deep.equal(values);
            done();
        });
    });

    it('catches errors', function (done) {
        var values = [
            '52439733-e2eb-469c-8704-27ef879fae68',
            'Wat?',
            '2eec55a1-a81c-42e9-82d5-25dd12824903'
        ];
        sut.validate(values, function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });
});

describe('Stream validation', function () {
    var sut = require(requirePath).stream;

    it('works with a basic streams', function (done) {
        async.parallel([
            function (callback) {
                var Readable = require('stream').Readable;
                var rs = new Readable();
                sut.validate(rs, function (err, result) {
                    expect(err).to.be.null();
                    callback();
                });
            },
            function (callback) {
                var fs = require('fs');
                var rs = fs.createReadStream('/proc/cpuinfo');
                sut.validate(rs, function (err, result) {
                    expect(err).to.be.null();
                    callback();
                });
            }
        ], function (err) {
            expect(err).to.be.undefined();
            done();
        });
    });

    it('rejects non stream options', function (done) {
        async.parallel([
            function (callback) {
                sut.validate('abc', function (err, result) {
                    expect(err).to.not.be.null();
                    callback();
                });
            },
            function (callback) {
                sut.validate(123, function (err, result) {
                    expect(err).to.not.be.null();
                    callback();
                });
            },
            function (callback) {
                sut.validate({}, function (err, result) {
                    expect(err).to.not.be.null();
                    callback();
                });
            }
        ], function (err) {
            expect(err).to.be.undefined();
            done();
        });
    });
});
