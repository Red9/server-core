var _ = require('underscore')._;
var async = require('async');

var config = require('./../config');
config.ProcessCommandLine();

var logger = requireFromRoot('support/logger');
logger.init('validateDB', '0');
var log = logger.log;

var resources = requireFromRoot('support/resources/resources');

var deepCheck = false;
var fixErrors = true;

// Guest User
var defaultUserId = '9e401d7a-3548-64be-6c6e-66a9e9a1800b';


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
                    errors.push('too many panels');
                }
                callback(null, errors);
            });

        });
    });
}

function fixDataset(id, errors, callbackDone) {
    if (_.indexOf(errors, 'no head panel') !== -1) {
        // Critical errors: only recourse is to delete the dataset.
        resources.dataset.delete(id, function() {
            callbackDone(null, ['deleted dataset']);
        });
    } else {
        async.series([
            function(callback) {
                if (_.indexOf(errors, 'no owner') !== -1) {
                    resources.dataset.update(id, {owner: defaultUserId}, function() {
                        callbackDone(null, ['set owner to default.']);
                    }, true);
                } else {
                    callback(null, 'no change');
                }
            }
        ], function(err, results) {
            callbackDone(null, results);
        });
    }
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

            // TODO(SRLM): Add check that gets number of rows, and calculates average frequency.

            callback(null, errors);
        });
    });
}

function fixPanel(id, errors, callbackDone) {
    if (_.indexOf(errors, 'data does not exist') !== -1) {
        // Critical errors: only recourse is to delete the panel.
        resources.panel.delete(id, function(err) {
            callbackDone(null, ['deleted panel']);
        });
    } else {
        async.series([
            function(callback) {
                if (_.indexOf(errors, 'mismatched startTime') !== -1
                        || _.indexOf(errors, 'mismatched endTime')) {
                    resources.panel.calculatePanelProperties(id, false, function(err, properties) {
                        resources.panel.update(id,
                                {
                                    startTime: properties.startTime,
                                    endTime: properties.endTime
                                }, function(err) {
                            callback(null, 'fixed times');
                        }, true);
                    });
                } else {
                    callback(null, 'no change');
                }
            }
        ], function(err, results) {
            callbackDone(null, results);
        });
    }
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

function fixEvent(id, errors, callbackDone) {
    if (_.indexOf(errors, 'startTime >= endTime') !== -1
            || _.indexOf(errors, 'time not in panel bounds') !== -1) {
        // Critical errors: only recourse is to delete the event
        resources.event.delete(id, function() {
            callbackDone(null, ['deleted event']);
        });
    } else {
        callbackDone(null, []);
    }
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

function fixVideo(id, errors, callbackDone) {
    async.series([
        function(callback) {
            if (_.indexOf(errors, 'invalid host') !== -1) {
                resources.video.update(id, {host: 'YouTube'}, function(err) {
                    callback(null, 'set host to YouTube');
                });
            } else {
                callback(null, 'no change');
            }
        }
    ], function(err, results) {
        callbackDone(null, results);
    });
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

function fixComment(id, errors, callback) {
    if (_.indexOf(errors, 'invalid author') !== -1) {
        resources.comment.update(id, {author: guestUserId}, function(err) {
            callback(null, ['update author']);
        }, true);
    } else {
        callback(null, ['no change']);
    }
}


// -----------------------------------------------------------------------------

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

function fixResource(fixFunction, invalidList, callbackDone) {
    async.mapSeries(invalidList,
            function(item, callback) {
                fixFunction(item.id, item.errors, function(err, resolution) {
                    item.resolution = resolution;
                    callback(null, item);
                });
            },
            function(err, results) {
                callbackDone(null, results);
            }
    );
}


function runResource(name, check, fix) {
    return function(callback) {
        checkResource(name, check, function(err, invalidList) {
            if (fixErrors === true) {
                fixResource(fix, invalidList, function(err, newList) {
                    callback(null, {
                        type: name,
                        list: newList
                    });
                });
            } else {
                callback(null, {
                    type: name,
                    list: invalidList
                });
            }
        });
    };
}

function checkForInvalidResources(callbackDone) {
    log.info('===== Validating each resource.');
    async.parallel([
        runResource('dataset', checkDataset, fixDataset),
        runResource('event', checkEvent, fixEvent),
        runResource('panel', checkPanel, fixPanel),
        runResource('video', checkVideo, fixVideo),
        runResource('comment', checkComment, fixComment)
    ], function(err, result) {
        if (err) {
            log.error('Error: ' + err);
        }

        async.eachSeries(result, function(invalidOfType, callbackType) {
            async.eachSeries(invalidOfType.list, function(resource, callbackResource) {
                var message = invalidOfType.type + ' ' + resource.id + ' has errors: ' + resource.errors.join(', ');
                if (typeof resource.resolution !== 'undefined') {
                    message += ', resoultion of ';
                    if (resource.resolution.length === 0) {
                        message += ' no resolution';
                    } else {
                        message += resource.resolution.join(', ');
                    }
                }
                log.error(message);
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
            resources.dataset.get({id: datasetId}, function(datasetList) {
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
            checkResourceEachHasDataset(resources.panel, 'datasetId', function(err, orphans) {
                callback(null, {
                    type: 'panel',
                    orphans: orphans
                });
            });
        },
        function(callback) {
            checkResourceEachHasDataset(resources.event, 'datasetId', function(err, orphans) {
                callback(null, {
                    type: 'event',
                    orphans: orphans
                });
            });
        },
        function(callback) {
            checkResourceEachHasDataset(resources.video, 'dataset', function(err, orphans) {
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
            var type = orphansOfType.type;
            async.eachSeries(orphansOfType.orphans, function(id, callbackOrphan) {
                var message = type + ' ' + id + ' does not have a valid dataset';
                if (fixErrors === true) {
                    resources[type].delete(id, function(err) {
                        if (err) {
                            log.error('Error deleting: ' + err);
                        } else {
                            log.error(message + '... Deleted.');
                        }
                        callbackOrphan(null);
                    });
                } else {
                    log.error(message);
                    callbackOrphan(null);
                }
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

