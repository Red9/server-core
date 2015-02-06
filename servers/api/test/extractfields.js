'use strict';

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../routes/utilities/extractfields';

describe('splitString', function () {
    var sut = require(requirePath).splitString;

    it('can split a string without any substrings', function (done) {
        expect(sut('abc,def,hij')).to.deep.equal(['abc', 'def', 'hij']);
        done();
    });

    it('can split a string with a single nested level', function (done) {
        expect(sut('abc(def,hij)')).to.deep.equal(['abc(def,hij)']);
        done();
    });

    it('can split with fields who have nested values', function (done) {
        expect(sut('123,abc(def),hij')).to.deep.equal(
            ['123', 'abc(def)', 'hij']
        );
        done();
    });

    it('can work with multiple levels of nesting', function (done) {
        expect(sut('abc(def(hij(hello),hi)),xyz')).to.deep.equal(
            ['abc(def(hij(hello),hi))', 'xyz']
        );
        done();
    });

    it('throws errors for unbalanced parethesis', function (done) {
        expect(function () {
            sut('abc,def,hij(');
        }).to.throw();
        done();
    });
});


describe('splitField', function () {
    var sut = require(requirePath).splitField;

    it('handles the basic case', function (done) {
        expect(sut('abc(def)')).to.deep.equal({
            key: 'abc',
            value: 'def'
        });
        done();
    });

    it('handles no nested fields', function (done) {
        expect(sut('abc')).to.deep.equal({
            key: 'abc'
        });
        done();
    });

    it('handles multiple nested fields', function (done) {
        expect(sut('abc(def(hij))')).to.deep.equal({
            key: 'abc',
            value: 'def(hij)'
        });
        done();
    });
});

describe('stringToObject', function () {
    var sut = require(requirePath).stringToObject;

    it('handles a basic non-recursive case', function (done) {
        expect(sut('abc,def,hij')).to.deep.equal({
            abc: null,
            def: null,
            hij: null
        });
        done();
    });

    it('handles mixed basic and nesting', function (done) {
        expect(sut('abc(def),hij,klm(nop,qrs)')).to.deep.equal({
            abc: {
                def: null
            },
            hij: null,
            klm: {
                nop: null,
                qrs: null
            }
        });
        done();
    });

    it('handles multiple nested levels', function (done) {
        expect(sut('abc(def(hij(klm)))')).to.deep.equal(
            {abc: {def: {hij: {klm: null}}}}
        );
        done();
    });

    it('does not merge duplicate keys', function (done) {
        expect(sut('abc(def),abc')).to.deep.equal({abc: null});
        expect(sut('abc,abc(def)')).to.deep.equal({abc: {def: null}});
        done();
    });

    it('works with a single field', function (done) {
        expect(sut('abc')).to.deep.equal({
            abc: null
        });
        done();
    });
});

var modelsMock = {
    a: {
        associations: ['b']
    },
    b: {
        associations: ['a']
    },
    c: {
        associations: ['a', 'b']
    }
};

describe('extractFields', function () {
    var sut = require(requirePath);
    it('handles a basic case', function (done) {
        var result = {
            'attributes': [],
            'include': [
                {
                    'model': {
                        'associations': [
                            'b'
                        ]
                    },
                    'attributes': [],
                    'include': []
                },
                {
                    'model': {
                        'associations': [
                            'a'
                        ]
                    },
                    'attributes': [],
                    'include': []
                }
            ]
        };

        expect(sut(modelsMock, '', ['a', 'b'])).to.deep.equal(result);
        done();
    });
// Inclusion tree
    it('handles nested case', function (done) {
        var result = {
            attributes: [],
            include: [
                {
                    model: {
                        associations: [
                            'a',
                            'b'
                        ]
                    },
                    attributes: [],
                    include: [
                        {
                            model: {
                                associations: [
                                    'b'
                                ]
                            },
                            attributes: [],
                            include: []
                        },
                        {
                            model: {
                                associations: [
                                    'a'
                                ]
                            },
                            attributes: [],
                            include: []
                        }
                    ]
                }
            ]
        };

        expect(sut(modelsMock, '', ['c.a', 'c.b'])).to.deep.equal(result);
        done();
    });


});






























