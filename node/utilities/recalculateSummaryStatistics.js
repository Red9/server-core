var underscore = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('recalculateSS', '0');
var log = logger.log;

var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');
var eventResource = requireFromRoot('support/resources/event');
var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');

var limitMax = 6;

function processEvent(event, callback) {
    // Get the headPanelId
    datasetResource.get({id: event.datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            var message = 'Incorrect number (' + datasetList.length + ') of datasets with id ' + event.datasetId + ' for event ' + event.id;
            log.error(message);
            callback(message);
        } else {
            var headPanelId = datasetList[0].headPanelId;
            summaryStatisticsResource.calculate(headPanelId, event.startTime, event.endTime,
                    function(summaryStatistics) {
                        eventResource.update(event.id, {summaryStatistics: summaryStatistics},
                        function(err) {
                            callback(err);
                        });
                    });
        }
    });
}

function processPanel(panel, callback) {
    summaryStatisticsResource.calculate(panel.id, panel.startTime, panel.endTime,
            function(summaryStatistics) {
                panelResource.update(panel.id, {summaryStatistics: summaryStatistics},
                function(err) {
                    callback(err);
                });
            });
}

function processResource(task, callbackDone) {
    task.resource.get({}, function(resourceList) {
        var start = new Date().getTime();
        async.eachLimit(resourceList, limitMax,
                task.processor,
                function(err) {
                    if (err) {
                        log.error(err);
                    } else {
                        var totalTime = ((new Date().getTime()) - start) / 1000;
                        log.info(resourceList.length + ' items in ' + totalTime + ' seconds');
                    }
                    callbackDone();
                });
    });
}

log.info('Recalculate Summary Statistics Started.');
var queue = async.queue(processResource, 1);
queue.drain = function() {
    log.info('All done.');
    process.exit();
};

queue.push({
    resource: eventResource,
    processor: processEvent
});

/*
queue.push({
    resource: panelResource,
    processor: processPanel
});
*/





