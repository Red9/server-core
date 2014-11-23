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

var requirePath = '../../resources/validators.js';

describe('id', function () {
    var sut = require(requirePath).id;


    it('validates UUID4 correctly', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bc7', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('rejects Red9 legacy IDs', function (done) {
        sut.validate('1cea42df-fbaa-e7a3-4c90-7379c3360b31', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });

    it('rejects invalid strings', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bcHello', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });
});

describe('idCSV', function () {
    var sut = require(requirePath).idCSV;


    it('validates single UUID4 correctly', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bc7', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('validates two UUID4 correctly', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bc7,cde3a082-8062-45bd-9005-05a8c1edf2a3', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('validates three UUID4 correctly', function (done) {
        sut.validate('a0f40541-5631-4c25-a21c-20613db27e67,5029b853-717b-4ec5-b3b7-a91580841bc7,cde3a082-8062-45bd-9005-05a8c1edf2a3', function (err, result) {
            expect(err).to.be.null();
            done();
        });
    });

    it('rejects invalid items', function (done) {
        sut.validate('Hi5029b853-717b-4ec5-b3b7-a91580841bc7,cde3a082-8062-45bd-9005-05a8c1edf2a3', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });

    it('rejects invalid seperators', function (done) {
        sut.validate('5029b853-717b-4ec5-b3b7-a91580841bc7;cde3a082-8062-45bd-9005-05a8c1edf2a3', function (err, result) {
            expect(err).to.not.be.null();
            done();
        });
    });

});


describe('multiArray', function () {

    var single = require(requirePath).id; // just something...
    var sut = require(requirePath).multiArray(single);

    it('works on single', function (done) {
        var value = '52439733-e2eb-469c-8704-27ef879fae68';
        sut.validate(value, function (err, result) {
            expect(err).to.be.null();
            expect(result).to.equal(value);
            done();
        });
    });

    it('works on multiple', function (done) {
        var values = [
            '52439733-e2eb-469c-8704-27ef879fae68',
            '2eec55a1-a81c-42e9-82d5-25dd12824903'
        ];
        sut.validate(values, function (err, result) {
            expect(err).to.be.null();
            expect(result).to.equal(values);
            done();
        });
    });

    it('catches errors', function(done){
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




















