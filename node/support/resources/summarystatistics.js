var spawn = require('child_process').spawn;
var underscore = require('underscore')._;

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var datasetResource = requireFromRoot('support/resources/dataset');


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

    datasetResource.getDatasets({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {

        } else {
            var dataset = datasetList[0];
            var axes = dataset.panels[panelId].axes;

            var axesString = '';
            underscore.each(axes, function(axis, index) {
                if (index === 0) {
                    axesString = axis;
                } else {
                    axesString += ',' + axis;
                }
            });

            var parameters = [];
            parameters.push('-jar');
            parameters.push('bin/statistician.jar');
            parameters.push('--axes');
            parameters.push(axesString);
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
                if (code !== 0) {
                    log.error("Error log: " + stderr);
                } else {
                    try {
                        result = JSON.parse(stdout);
                    } catch (e) {
                        log.error('Could not parse statistician stdout');
                    }
                }
                callback(result);
            });
        }
    });
};