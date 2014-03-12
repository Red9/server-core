var spawn = require('child_process').spawn;
var underscore = require('underscore')._;

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var panelResource = requireFromRoot('support/resources/panel');


/**
 * 
 * @param {uuid} datasetId
 * @param {int} startTime
 * @param {int} endTime
 * @param {function} callback (statistics)
 * @returns {undefined}
 */
exports.calculate = function(panelId, startTime, endTime, callback) {

    var calculationStartTime = new Date();

    panelResource.getPanel({id: panelId}, function(panelList) {
        if (panelList.length !== 1) {
            log.warn('Warning: no panel found that matches given id of ' + panelId);
            callback({});
        } else {
            var panel = panelList[0];
            var axes = panel.axes;

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
            log.info("Starting statistics for panel " + panelId);

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