var underscore = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('calculateStatistics', '0');
var log = logger.log;

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});

var panelResource = requireFromRoot('support/resources/panel');



var query = 'SELECT DISTINCT id FROM raw_data;'
var runningTotal = 0;

cassandraDatabase.execute(query, [], function(err, result) {
    if (err) {
        log.error('Error: ' + err);
    }
    var idList = underscore.pluck(result.rows, 'id');
    async.eachLimit(idList, 4, function(id, callback) {
        var countQuery = 'SELECT count(*) FROM raw_data WHERE id = ? LIMIT 9999999';
        var param = [
            {
                value: id,
                hint: 'uuid'
            }
        ];
        cassandraDatabase.execute(countQuery, param, function(err, result) {
            if (err) {
                log.error('Error: ' + err);
            }
            var count = result.rows[0].count;
            console.log(id + ',' + count);
            runningTotal += parseInt(count);
            callback();
        });
    }, function(err) {
        console.log('Total: ' + runningTotal);
        process.exit();
    });
});

/*
 panelResource.get({}, function(panelList) {
 var memoInit = {
 totalRows: 0
 };
 var result = underscore.reduce(panelList, function(memo, panel) {
 if (typeof panel.summaryStatistics.static === 'undefined') {
 if (typeof panel.summaryStatistics.message !== 'undefined') {
 console.log('No data:   ' + panel.id);
 } else {
 console.log('Undefined: ' + panel.id);
 }
 } else {
 memo.totalRows += panel.summaryStatistics.static.panelStructure.rowCount.value;
 }
 return memo;
 }, memoInit);
 
 console.log('Total rows: ' + result.totalRows);
 
 });
 */