//var cassandra = require('../lib/support.datasource.cassandra');

/*
CREATE KEYSPACE unittest WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': '1'
};
*/


exports['cassandra database'] = {
    setUp: function(callback) {
        callback();
    },
    tearDown: function(callback) {
        callback();
    },
    'add hint': function(test) {
        test.done();
        
    }
};