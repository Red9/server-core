var _ = require('underscore')._;

var path = '../lib/resource.description.event';

exports['resource.description.event checkEvent'] = {
    setUp: function (callback) {
        this.sut = require(path).checkResource;
        this.event = {
            startTime: 1234,
            endTime: 2345,
            source: {
                type: 'auto'
            }
        };
        callback();
    },
    'basic': function (test) {
        test.expect(1);
        this.sut(this.event, function (err) {
            test.ok(!err);
            test.done();
        });
    },
    'checkSource manual': function (test) {
        this.event.source.type = 'manual';
        this.sut(this.event, function (err) {
            test.ok(!err);
            test.done();
        });
    },
    'checkSource auto': function (test) {
        this.event.source.type = 'auto';
        this.sut(this.event, function (err) {
            test.ok(!err);
            test.done();
        });
    },
    'checkSource empty source': function (test) {
        delete this.event.source.type;
        this.sut(this.event, function (err) {
            test.ok(err);
            test.done();
        });
    },
    'checkSource whatever type': function (test) {
        this.event.source.type = 'whatever';
        this.sut(this.event, function (err) {
            test.ok(err);
            test.done();
        });
    },
    'checkSource wrong type': function (test) {
        this.event.source = '';
        this.sut(this.event, function (err) {
            test.ok(err);
            test.done();
        });
    }
};


