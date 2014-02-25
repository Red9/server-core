var spawn = require('child_process').spawn;

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');


/**
 * 
 * @param {uuid} datasetId
 * @param {int} startTime
 * @param {int} endTime
 * @param {function} callback (statistics)
 * @returns {undefined}
 */
exports.calculate = function(datasetId, panelId, startTime, endTime, callback) {
    
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
    parameters.push('--panel');
    parameters.push(panelId);

    var statistician = spawn('java', parameters);
    log.info("Starting statistics for dataset " + datasetId);

    statistician.on('exit', function(code, signal) {
        statistician.stdout.setEncoding("utf8");
        statistician.stderr.setEncoding("utf8");
        var stdout = statistician.stdout.read();
        var stderr = statistician.stderr.read();
        
        var result = {};
        
        log.debug("Statistics done (" + (new Date() - calculationStartTime) + "ms) Code: " + code);
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