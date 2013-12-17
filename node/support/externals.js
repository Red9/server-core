var spawn = require('child_process').spawn;

var database = require('./../support/database');
var log = require('./../support/logger').log;
var config = require('./../config');


exports.BeginStatisticsCalculation = function(event_uuid, callback) {
    
    var startTime = new Date();
    
    var parameters = [];
    parameters.push('-jar');
    parameters.push('bin/statistician.jar');
    parameters.push('--event');
    parameters.push(event_uuid);
    parameters.push('--cassandrahost');
    parameters.push('127.0.0.1');
    parameters.push('--childrenpath');
    parameters.push(config.statistician_children);
    var statistician = spawn('java', parameters);
    log.info("Starting statistics for event" + event_uuid);

    statistician.on('exit', function(code, signal) {
        statistician.stdout.setEncoding("utf8");
        statistician.stderr.setEncoding("utf8");
        var stdout = statistician.stdout.read();
        var stderr = statistician.stderr.read();
        if(code !== 0){
            log.error("Statistics done (" + (new Date() - startTime) + "ms) Code: " + code);
            log.error("Error log: " + stderr);
        }else{
            log.info("Statistics for " + event_uuid + " done (" + (new Date() - startTime) + "ms)");
        }
        
        if(typeof callback === 'function'){
            callback(code, stdout, stderr);
        }
    });
};