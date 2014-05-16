var underscore = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('validateDB', '0');
var log = logger.log;

var eventResource = requireFromRoot('support/resources/event');
var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');


function checkDatasetsHavePanel(callbackDone) {

    log.info('+++++ Checking datasets for valid panel.');

    datasetResource.get({}, function(datasetList) {
        async.eachLimit(datasetList, 6,
                function(dataset, callback) {
                    panelResource.calculatePanelProperties(dataset.headPanelId,
                            function(err, properties) {
                                if (err) {
                                    eventResource.get({datasetId: dataset.id}, function(eventList) {
                                        log.error(dataset.id + 'error: ' + err
                                                + '( has ' + eventList.length + ' events)');
                                        callback();

                                    });
                                } else {
                                    callback();
                                }


                            });
                },
                function(err) {
                    if (err) {
                        log.error(err);
                    }
                    log.info('+++++ Done checking datasets for valid panel.');
                    callbackDone();
                });
    });
}


// Check that all event datasetId's exist.
// Check that all events have valid start and end times.
function checkEventsForValid(callbackDone) {
    log.info('----- Checking events for valid dataset');
    eventResource.get({}, function(eventList) {
        async.eachLimit(eventList, 6,
                function(event, callback) {
                    datasetResource.get({id: event.datasetId}, function(datasetList) {
                        if (datasetList.length !== 1) {
                            log.error('Event ' + event.id + ' has incorrect number (' + datasetList.length + ') of dataset matches for id ' + event.datasetId);
                            callback();
                        } else {
                            panelResource.calculatePanelProperties(datasetList[0].headPanelId,
                                    function(err, properties) {
                                        // May be undefined if panel does not exist.
                                        if (typeof properties !== 'undefined') {
                                            var message = 'Event ' + event.id + ' has invalid startTime ' + event.startTime + ' and/or invalid endTime ' + event.endTime;
                                            if (event.startTime >= event.endTime
                                                    || event.endTime < properties.startTime
                                                    || event.startTime > properties.endTime) {
                                                log.error(message);
                                            }
                                        }
                                        callback();
                                    });
                        }

                    });
                },
                function(err) {
                    if (err) {
                        log.error(err);
                    }
                    log.info('----- Done checking events for valid dataset');
                    callbackDone();
                });
    });
}



checkDatasetsHavePanel(function() {
    checkEventsForValid(function() {
        log.info('All done.');
        process.exit();
    });
});