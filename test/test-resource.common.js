var proxyquire = require('proxyquire');


exports['resourcecommon calculateWhereQuery'] = {
    setUp: function(callback) {
        this.sut = require('../lib/newfiles/resource.common');
        callback();
    },
    tearDown: function(callback) {
        callback();
    },
    'basic': function(test) {
        var query = {type: 'Wave'};
        var result = "type = 'Wave'";

        test.strictEqual(this.sut.constructWhereQuery(query), result);
        test.done();
    }
};

exports['resourcecommon valueToCassandraString'] = {
    setUp: function(callback) {

        //console.log("__dirname: " + __dirname);
        var self = this;

        this.sut = proxyquire('../lib/newfiles/resource.common',
                {
                    './logger': {
                        error: function(message) {
                            self.log(message);
                        }
                    }
                }).valueToCassandraString;
        callback();
    },
    tearDown: function(callback) {
        callback();
    },
    'basic: strings': function(test) {
        test.strictEqual(this.sut('varchar', "hello"), "'hello'");
        test.strictEqual(this.sut('varchar', "with 'single' quotes"), "'with ''single'' quotes'");
        test.done();
    },
    'basic: numbers': function(test) {
        test.strictEqual(this.sut('int', 1234), '1234');
        test.strictEqual(this.sut('double', 1234.56789), '1234.56789');
        test.done();
    },
    'basic: uuid': function(test){
        test.strictEqual(this.sut('uuid', 'fec5ac27-912a-450c-8d64-9843b4f8bdbc'), 'fec5ac27-912a-450c-8d64-9843b4f8bdbc');
        test.done();
    },
    
    
    'logs errors on objects and arrays': function(test) {
        test.expect(2);
        this.log = function(message) {
            test.ok(true);
        };

        this.sut('', {});
        this.sut('', []);

        test.done();
    }
};