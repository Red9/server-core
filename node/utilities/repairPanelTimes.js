/** Updates the panel startTime and endTime variables to match the actual data in the database.
 */

var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('recalculateSS', '0');
var log = logger.log;

var panelResource = requireFromRoot('support/resources/panel');

var limitMax = 2;

function repairPanel(id, callback) {
    panelResource.calculatePanelProperties(id, function(err, properties) {
        if (err) {
            log.error('Error: ' + err);
        } else {
            var update = {
                startTime: properties.startTime,
                endTime: properties.endTime
            };

            panelResource.update(id, update, function(err, modifiedPanel) {
                if (err) {
                    log.error('Error: ' + err);
                }
                callback();
            }, true);
        }
    });
}

function updateAllPanels() {
    panelResource.get({}, function(panelList) {
        async.eachLimit(panelList, limitMax,
                function(panel, callback) {
                    log.info('updating ' + panel.id);
                    repairPanel(panel.id, callback);
                },
                function(err) {
                    if (err) {
                        log.error('Error: ' + err);
                    }
                    log.info('Updated ' + panelList.length + ' panels.');
                    process.exit();
                });
    });
}

updateAllPanels();


