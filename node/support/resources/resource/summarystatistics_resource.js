var spawn = require('child_process').spawn;

var log = require('./../../logger').log;
var config = require('./../../../config');


/**
 * 
 * @param {uuid} datasetId
 * @param {int} startTime
 * @param {int} endTime
 * @param {function} callback (statistics)
 * @returns {undefined}
 */
exports.calculate = function(datasetId, startTime, endTime, callback) {
    
    var calculationStartTime = new Date();
    
    var parameters = [];
    parameters.push('-jar');
    parameters.push('bin/statistician.jar');
    parameters.push('--dataset');
    parameters.push(datasetId);
    parameters.push('--cassandrahost');
    parameters.push('127.0.0.1');
    parameters.push('--childrenpath');
    parameters.push(config.statistician_children);
    parameters.push('--startTime');
    parameters.push(startTime);
    parameters.push('--endTime');
    parameters.push(endTime);

    var statistician = spawn('java', parameters);
    log.info("Starting statistics for dataset " + datasetId);

    statistician.on('exit', function(code, signal) {
        statistician.stdout.setEncoding("utf8");
        statistician.stderr.setEncoding("utf8");
        var stdout = statistician.stdout.read();
        var stderr = statistician.stderr.read();
        
        var result = {};
        
        log.info("Statistics done (" + (new Date() - calculationStartTime) + "ms) Code: " + code);
        if(code !== 0){
            log.error("Error log: " + stderr);
        }else{
            try{
                result = JSON.parse(stdout);
            }catch(e){
            }
        }
        callback(result);
    });
};