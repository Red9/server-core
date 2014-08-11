var _ = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('validateDB', '0');
var log = logger.log;

var resources = requireFromRoot('support/resources/resources');
var eventResource = requireFromRoot('support/resources/event');
var datasetResource = requireFromRoot('support/resources/dataset');
var panelResource = requireFromRoot('support/resources/panel');
var videoResource = requireFromRoot('support/resources/video');
var commentResource = requireFromRoot('support/resources/comment');

var deepCheck = false;
// TODO: Make sure that all IDs are unique (or document why it's guarenteed)

// -----------------------------------------------------------------------------
// Validate Dataset
// 
// A dataset can be incorrect in a number of ways:
//  - Non existant panel
//  - Non existant owner
//  - More than one panel
// -----------------------------------------------------------------------------
function checkDataset(dataset, callback) {
    var errors = [];
    resources.user.get({id: dataset.owner}, function(ownerList) {
        if (ownerList.length === 0) {
            errors.push('no owner');
        }
        resources.panel.get({id: dataset.headPanelId}, function(panelList) {
            if (panelList.length === 0) {
                errors.push('no head panel');
            }
            resources.panel.get({datasetId: dataset.id}, function(allPanelList) {
                if (allPanelList.length > 1) {
                    errors.push('too many panels (' + allPanelList.length + ')');
                }
                callback(null, errors);
            });

        });
    });
}


// -----------------------------------------------------------------------------
// Validate Panel
//
// A panel can be incorrect in a number of ways:
//  - no summaryStatistics
//  - Frequency not 100Hz
//  - doesn't actually exist (no rows in database, via panel properties)
//  - startTime/endTime may be incorrect (stored, vs the actual data)
//  - incorrect axes field
// -----------------------------------------------------------------------------

function checkPanel(panel, callback) {
    var errors = [];

    resources.panel.exists(panel.id, function(err, exists) {
        if (exists === false) {
            errors.push('data does not exist');
            // Serious enough to quit now
            callback(null, errors);
            return;
        }

        if (typeof panel.summaryStatistics === 'undefined'
                || _.keys(panel.summaryStatistics).length === 0) {
            errors.push('missing summaryStatistics');
        }

        if (_.isArray(panel.axes) === false) {
            errors.push('invalid axes');
        }

        resources.panel.calculatePanelProperties(panel.id, deepCheck, function(err, properties) {
            if (err) {
                log.error('    error: ' + err);
            }

            if (panel.startTime !== properties.startTime) {
                errors.push('mismatched startTime');
            }
            if (panel.endTime !== properties.endTime) {
                errors.push('mismatched endTime');
            }

            // TODO(SRLM): Add check that get's number of rows, and calculates average frequency.

            callback(null, errors);
        });
    });
}

// -----------------------------------------------------------------------------
// Validate Event
// 
// An event can be incorrect in a number of ways:
//  - startTime or endTime out of bounds of panel
//  - startTime >= endTime
//  - no summaryStatistics
// -----------------------------------------------------------------------------

function checkEvent(event, callback) {
    var errors = [];

    if (event.startTime >= event.endTime) {
        errors.push('startTime >= endTime');
    }

    if (typeof event.summaryStatistics === 'undefined'
            || _.keys(event.summaryStatistics).length === 0) {
        errors.push('missing summaryStatistics');
    }

    resources.dataset.get({id: event.datasetId}, function(datasetList) {
        var datasetStartTime = Number.MIN_VALUE;

        var datasetEndTime = Number.MAX_VALUE;
        try {
            // If the dataset and/or panel does not exist we'll get an error.
            // That will be detected as an orphan event, so we don't want to
            // indicate an error here if that is the case.
            datasetStartTime = datasetList[0].headPanel.startTime;
            datasetEndTime = datasetList[0].headPanel.endTime;
        } catch (e) {
            console.log('caught orphan event');
        }

        if (event.endTime < datasetStartTime
                || event.startTime > datasetEndTime) {
            errors.push('time not in panel bounds');
        }
        callback(null, errors);
    }, ['headPanel']);

}


// -----------------------------------------------------------------------------
// Validate Videos
//
// A video can be incorrect in a number of ways:
//  - host and hostId are incorrect
//  - video does not exist
//  
//  Still need to work with the YouTube API. Had problems, documented in DW-210.
// -----------------------------------------------------------------------------
function checkVideo(video, callback) {
    var errors = [];

    if (video.host === 'YouTube') {
        var youtubeRegEx = /[a-zA-Z0-9_-]{11}/g;
        if (youtubeRegEx.exec(video.hostId) === null) {
            errors.push('invalid hostId');
        }
    } else {
        errors.push('invalid host');
    }
    callback(null, errors);
}

// -----------------------------------------------------------------------------
// Validate Comments
//
// A comment can be incorrect in a number of ways:
//  - resourceType is invalid
//  - resource id is invalid
//  - author id is invalid
//  - startTime or endTime is invalid (not tested)
// -----------------------------------------------------------------------------
function checkComment(comment, callback) {
    var errors = [];
    if (typeof resources[comment.resourceType] === 'undefined') {
        errors.push('invalid resource type');
        callback(null, errors);
        return;
    }

    resources[comment.resourceType].get({id: comment.resource}, function(resourceList) {
        if (resourceList.length === 0) {
            errors.push('invalid resource id');
        }
        resources.user.get({id: comment.author}, function(userList) {
            if (userList.length === 0) {
                errors.push('invalid author');
            }
            callback(null, errors);
        });
    });
}

function checkResource(resourceType, checkFunction, callbackDone) {
    resources[resourceType].get({}, function(resourceList) {
        async.reduce(resourceList, [], function(memo, resource, callback) {
            checkFunction(resource, function(err, errorList) {
                if (errorList.length !== 0) {
                    memo.push({
                        id: resource.id,
                        errors: errorList
                    });
                }
                callback(null, memo);
            });
        }, callbackDone);
    });
}


function checkForInvalidResources(callbackDone) {
    log.info('===== Validating each resource.');
    async.parallel([
        function(callback) {
            checkResource('dataset', checkDataset, function(err, invalidList) {
                callback(null, {
                    type: 'dataset',
                    list: invalidList
                });
            });
        },
        function(callback) {
            checkResource('event', checkEvent, function(err, invalidList) {
                callback(null, {
                    type: 'event',
                    list: invalidList
                });
            });
        },
        function(callback) {
            checkResource('panel', checkPanel, function(err, invalidList) {
                callback(null, {
                    type: 'panel',
                    list: invalidList
                });
            });
        },
        function(callback) {
            checkResource('video', checkVideo, function(err, invalidList) {
                callback(null, {
                    type: 'video',
                    list: invalidList
                });
            });
        },
        function(callback) {
            checkResource('comment', checkComment, function(err, invalidList) {
                callback(null, {
                    type: 'comment',
                    list: invalidList
                });
            });
        }


        //checkForInvalidVideos
    ], function(err, result) {
        if (err) {
            log.error('Error: ' + err);
        }

        async.eachSeries(result, function(invalidOfType, callbackType) {
            async.eachSeries(invalidOfType.list, function(resource, callbackResource) {
                log.error(invalidOfType.type + ' ' + resource.id + ' has errors: ' + resource.errors.join(', '));
                callbackResource(null);
            }, function(err) {
                callbackType(null);
            });
        }, function(err) {
            log.info('===== Done validating each resource.');
            callbackDone(null);
        });

    });
}


// -----------------------------------------------------------------------------
// Orphans
// 
// Most resources "point" to another resource (such as a dataset). We need to
// make sure that what they point to is still there.
// -----------------------------------------------------------------------------

function checkResourceEachHasDataset(resource, datasetIdKey, callbackDone) {
    resource.get({}, function(resourceList) {
        async.reduce(resourceList, [], function(memo, item, callback) {
            var datasetId = item[datasetIdKey];
            datasetResource.get({id: datasetId}, function(datasetList) {
                if (datasetList.length === 0) {
                    memo.push(item.id);
                }
                callback(null, memo);
            });
        }, function(err, result) {
            if (err) {
                log.error('Processing error: ' + err);
            }
            callbackDone(null, result);
        });
    });
}

function checkCommentHasResource(callbackDone) {
    resources.comment.get({}, function(commentList) {
        async.reduce(commentList, [], function(memo, comment, callback) {
            resources[comment.resourceType].get({id: comment.resource}, function(resourceList) {
                if (resourceList.length === 0) {
                    memo.push(comment.id);
                }
                callback(null, memo);
            });
        }, function(err, result) {
            if (err) {
                log.error('Processing error: ' + err);
            }
            callbackDone(null, result);
        });
    });
}

function checkForOrphanResources(callbackDone) {
    log.info('&&&&& Checking for orphan resources.');

    async.parallel([
        function(callback) {
            checkResourceEachHasDataset(panelResource, 'datasetId', function(err, orphans) {
                callback(null, {
                    type: 'panel',
                    orphans: orphans
                });
            });
        },
        function(callback) {
            checkResourceEachHasDataset(eventResource, 'datasetId', function(err, orphans) {
                callback(null, {
                    type: 'event',
                    orphans: orphans
                });
            });
        },
        function(callback) {
            checkResourceEachHasDataset(videoResource, 'dataset', function(err, orphans) {
                callback(null, {
                    type: 'video',
                    orphans: orphans
                });
            });
        },
        function(callback) {
            checkCommentHasResource(function(err, orphans) {
                callback(null, {
                    type: 'comment',
                    orphans: orphans
                });
            });
        }
    ], function(err, result) {
        async.eachSeries(result, function(orphansOfType, callbackType) {
            async.eachSeries(orphansOfType.orphans, function(id, callbackOrphan) {
                log.error(orphansOfType.type + ' ' + id + ' does not have a valid dataset.');
                callbackOrphan(null);
            }, function(err) {
                callbackType(null);
            });
        }, function(err) {
            log.info('&&&&& Done checking for orphan resources.');
            callbackDone(null);
        });
    });
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async.series([
    checkForOrphanResources,
    checkForInvalidResources
], function(err, result) {
    if (err) {
        log.error('Error: ' + err);
    }
    log.info('All done.');
    process.exit();
});

