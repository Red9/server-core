var _ = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('validateDB', '0');
var log = logger.log;

var eventResource = requireFromRoot('support/resources/event');
var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');

// TODO: Check that user references are valid.


// Check that all datasets have a valid panel
function checkDatasetsHavePanel(callbackDone) {

    log.info('+++++ Checking datasets for valid panel.');

    datasetResource.get({}, function(datasetList) {
        async.eachLimit(datasetList, 6,
                function(dataset, callback) {
                    panelResource.calculatePanelProperties(dataset.headPanelId,
                            function(err, properties) {
                                // If we can calculate properties, then everything is good.
                                if (err) {
                                    log.error(dataset.id + 'error: ' + err);
                                }
                                callback();
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

// Check that all panels are at 100 Hz
function checkPanelForCorrectFrequency(callbackDone) {



    log.info('***** Checking panels for valid frequency.');
    panelResource.get({}, function(panelList) {
        async.eachLimit(panelList, 6,
                function(panel, callback) {
                    try {
                        if (panel.summaryStatistics.instantaneous.frequency.panelRow.average.value !== kFrequency) {
                            log.error('Panel ' + panel.id + ' is not ' + kFrequency + 'Hz');
                        }
                    } catch (e) {
                        log.error('Panel ' + panel.id + ' does not have summary statistics.');
                    }
                    callback();
                },
                function(err) {
                    if (err) {
                        log.error(err);
                    }
                    log.info('***** Done checking panels for valid frequency.');
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
                                            //console.log(event.id + ',' + event.endTime + ',' + properties.startTime);
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

// TODO: Write something that takes a resource, and makes sure that the datasetId still exists

// To check:
// Frequency is 100Hz
// All events overlap panel
// Panel actually exists (via calculating panel properties)

var kMaximumPanelLength = 1000 * 60 * 60 * 24;
var kFrequency = 100; // Hard coded 100Hz 10ms frequency.
function checkDataset(dataset, callbackDone) {
    panelResource.get({datasetId: dataset.id}, function(panelList) {
        eventResource.get({datasetId: dataset.id}, function(eventList) {
            if (panelList.length === 0) {
                log.error('dataset ' + dataset.id + ' does not have an existing panel.');
                callbackDone();
                return;
            }
            if (panelList.length > 1) {
                log.error('dataset ' + dataset.id + ' has too many panels (' + panelList.length + ')');
                callbackDone();
                return;
            }
            var panel = panelList[0];
            panelResource.calculatePanelProperties(panel.id, function(err, properties) {
                if (err) {
                    log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' error: ' + err);
                    callbackDone();
                    return;
                }

                if (panel.startTime !== properties.startTime) {
                    log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' has wrong startTime: ' + panel.startTime + ' !== ' + properties.startTime);
                }
                if (panel.endTime !== properties.endTime) {
                    log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' has wrong endTime: ' + panel.endTime + ' !== ' + properties.endTime);
                }
                if ((panel.endTime - panel.startTime) > kMaximumPanelLength) {
                    log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' is too long: ' + (panel.endTime - panel.startTime));
                }
                if (_.isEmpty(panel.summaryStatistics) === true) {
                    log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' has empty summary statistics.');
                }

                try {
                    if (panel.summaryStatistics.instantaneous.frequency.panelRow.average.value !== kFrequency) {
                        log.error('dataset ' + dataset.id + ' panel ' + panel.id + ' is not ' + kFrequency + 'Hz');
                    }
                } catch (e) {
                }

                async.each(eventList, function(event, callback) {
                    if (event.endTime < panel.startTime) {
                        log.error('dataset ' + dataset.id + ' event ' + event.id + ' has invalid start time.');
                    }
                    if (event.startTime > panel.endTime) {
                        log.error('dataset ' + dataset.id + ' event ' + event.id + ' has invalid end time.');
                    }
                    if (event.startTime >= event.endTime) {
                        log.error('dataset ' + dataset.id + ' event ' + event.id + ' has startTime >= endTime.');
                    }
                    callback();

                }, function(err) {
                    if (err) {
                        log.error('Error: ' + err);
                    }
                    callbackDone();
                });
            });
        });
    });

}

function checkDatasets(callbackDone) {
    log.info('===== Checking each dataset.');
    datasetResource.get({}, function(datasetList) {
        async.eachSeries(datasetList, function(dataset, callback) {
            checkDataset(dataset, callback);
        }, function(err) {
            if (err) {
                log.error('Error: ' + err);
            }
            log.info('===== Done checking each dataset.');
            callbackDone();
        });
    });
}


function checkResourceEachHasDataset(resource, callbackDone) {
    resource.get({}, function(resourceList) {
        async.eachSeries(resourceList, function(i, callback) {
            datasetResource.get({id: i.datasetId}, function(datasetList) {
                if (datasetList.length !== 1) {
                    log.error(resource.resource.name + ' ' + i.id + ' does not have a valid dataset.');
                }
                callback();
            });
        }, function(err) {
            if (err) {
                log.error('Error: ' + err);
            }
            callbackDone();
        });
    });
}

function checkForOrphanResources(callbackDone) {
    log.info('&&&&& Checking for orphan resources.');
    checkResourceEachHasDataset(panelResource, function() {
        checkResourceEachHasDataset(eventResource, function() {
            log.info('&&&&& Done checking for orphan resources.');
            callbackDone();
        });
    });
}


checkForOrphanResources(function() {
    checkDatasets(function() {
        log.info('All done.');
        process.exit();
    });
});
