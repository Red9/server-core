var proxyquire = require('proxyquire');
var sandbox = require('nodeunit').utils.sandbox;

var path = '../lib/support.logger.js';

exports['test log functions'] = {
    setUp: function(callback) {
        this.sut = sandbox(__dirname + '/' + path,
                {
                    exports: {},
                    console: {},
                    require: require
                }

        );
        callback();
    },
    tearDown: function(callback) {
        callback();
    },
    'log explicit request': function(test) {
        test.expect(4);

        this.sut.console.log = function(str) {
            test.notEqual(str, '');
        };
        this.sut.exports.debug('my message');
        this.sut.exports.info('my message');
        this.sut.exports.warning('my message');
        this.sut.exports.error('my message');

        test.done();
    }
};
