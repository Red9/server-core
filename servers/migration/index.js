var request = require('request');
var _ = require('underscore')._;
var fs = require('fs');
var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('general', {file: 'config/general.json'})
    .file('deployment', {file: 'config/' + process.env.NODE_ENV + '.json'});


var panelInputDir = nconf.get('panelInputDir');

var resource = require('red9resource');
var panel = require('red9panel').panelReader({
    dataPath: nconf.get('panelDataPath')
});
var path = require('path');
var async = require('async');

/**
 *
 * @param datasetList
 * @param callback {err, datasetIdMap}
 */
function loadDatasets(datasetList, doneCallback) {
    var migratedDatasets = {};

    function loadDataset(oldDataset, callback) {
        console.log('Uploading ' + oldDataset.id);
        var readStream = fs.createReadStream(path.join(panelInputDir, oldDataset.id + '.RNC'));
        oldDataset.ownerId = oldDataset.owner; // There's a key change!

        resource.helpers.createDataset(panel, resource, oldDataset, readStream, function (err, createdDataset) {
            if (err) {
                callback(err);
            } else {
                migratedDatasets[oldDataset.id] = {
                    old: oldDataset,
                    new: createdDataset
                };
                callback();
            }
        }, true);
    }

    async.eachLimit(datasetList, nconf.get('datasetAsyncLimit'), loadDataset, function (err) {
        doneCallback(err, migratedDatasets);
    });
}

function mapTime(newDatasetStart, oldDatasetStart, oldTime) {
    return newDatasetStart + (oldTime - oldDatasetStart);
}


function migrateLayouts(doneCallback) {
    var migratedLayouts = [];
    request({
        url: 'http://api.redninesensor.com/layout/',
        json: true
    }, function (err, response, layoutList) {
        async.eachLimit(layoutList, 20,
            function (layout, callback) {
                resource.layout.create(layout, function (err, createdLayout) {
                    if (err) {
                        console.log(err);
                    } else {
                        migratedLayouts.push(createdLayout.id);
                    }
                    process.nextTick(callback);
                }, true);
            }, function (err) {
                console.log('Migrated ' + _.size(migratedLayouts) + ' layouts');
                doneCallback(null, migratedLayouts);
            });
    });
}

function migrateUsers(doneCallback) {
    var migratedUsers = [];
    request({
        url: 'http://api.redninesensor.com/user/',
        json: true
    }, function (err, response, userList) {
        async.eachLimit(userList, 20,
            function (user, callback) {
                resource.user.create(user, function (err, createdUser) {
                    if (err) {
                        console.log(err);
                    } else {
                        migratedUsers.push(createdUser.id);
                    }
                    process.nextTick(callback);
                }, true);
            }, function (err) {
                console.log('Migrated ' + _.size(migratedUsers) + ' users');
                doneCallback(null, migratedUsers);
            });
    });
}

function migrateVideos(datasets, doneCallback) {
    var unmigratedVideos = [];
    var migratedVideos = [];
    request({
        url: 'http://api.redninesensor.com/video/',
        json: true
    }, function (err, response, videoList) {
        async.eachLimit(videoList, 20,
            function (video, callback) {
                if (_.has(datasets, video.dataset)) {
                    video.startTime = mapTime(datasets[video.dataset].new.startTime,
                        datasets[video.dataset].old.headPanel.startTime,
                        video.startTime);
                    video.dataset = datasets[video.dataset].new.id;

                    resource.video.create(video, function (err, createdVideo) {
                        if (err) {
                            console.log(err);
                        } else {
                            migratedVideos.push(createdVideo.id);
                        }
                        process.nextTick(callback);
                    }, true);
                } else {
                    unmigratedVideos.push(video.id);
                    process.nextTick(callback);
                }

            }, function (err) {
                console.log('Migrated ' + _.size(migratedVideos) + ' videos');
                console.log('Could not migrate ' + unmigratedVideos.length + ' videos');
                doneCallback(null, migratedVideos, unmigratedVideos);
            });
    });
}

function migrateComments(datasets, doneCallback) {
    var unmigratedComments = [];
    var migratedComments = [];
    request({
        url: 'http://api.redninesensor.com/comment/',
        json: true
    }, function (err, response, commentList) {
        async.eachLimit(commentList, 20,
            function (comment, callback) {
                if (_.has(datasets, comment.resource)) {
                    if (comment.startTime !== 0) {
                        comment.startTime = mapTime(datasets[comment.resource].new.startTime,
                            datasets[comment.resource].old.headPanel.startTime,
                            comment.startTime);
                    }
                    if (comment.endTime !== 0) {
                        comment.endTime = mapTime(datasets[comment.resource].new.startTime,
                            datasets[comment.resource].old.headPanel.startTime,
                            comment.endTime);
                    }

                    resource.comment.create(comment, function (err, createdComment) {
                        if (err) {
                            console.log(err);
                        } else {
                            migratedComments.push(createdComment.id);
                        }
                        process.nextTick(callback);
                    }, true);
                } else {
                    unmigratedComments.push(comment.id);
                    process.nextTick(callback);
                }

            }, function (err) {
                console.log('Migrated ' + _.size(migratedComments) + ' comments');
                console.log('Could not migrate ' + unmigratedComments.length + ' comments');
                doneCallback(null, migratedComments, unmigratedComments);
            });
    });
}

function migrateEvents(datasets, doneCallback) {
    var unmigratedEvents = [];
    var migratedEvents = [];
    request({
        url: 'http://api.redninesensor.com/event/',
        json: true
    }, function (err, response, eventList) {
        async.eachLimit(eventList, 20,
            function (event, callback) {
                if (_.has(datasets, event.datasetId)) {
                    event.startTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.headPanel.startTime,
                        event.startTime);
                    event.endTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.headPanel.startTime,
                        event.endTime);

                    resource.event.create(event, function (err, createdEvent) {
                        if (err) {
                            console.log(err);
                        } else {
                            migratedEvents.push(createdEvent.id);
                        }
                        process.nextTick(callback);
                    }, true);
                } else {
                    unmigratedEvents.push(event.id);
                    process.nextTick(callback);
                }

            }, function (err) {
                console.log('Migrated ' + _.size(migratedEvents) + ' events');
                console.log('Could not migrate ' + unmigratedEvents.length + ' events');
                doneCallback(null, migratedEvents, unmigratedEvents);
            });
    });
}

function getUploadableDatasets(callback) {
    var uploadableDatasets = [];
    var unmigratedDatasets = [];

    // Get a list of datasetIds that have panels
    var panelList = _.map(fs.readdirSync(panelInputDir), function (filename) {
        return filename.split('.')[0];
    });


    request({
        url: 'http://api.redninesensor.com/dataset/?expand=headPanel',
        json: true
    }, function (err, response, datasetList) {
        if (err) {
            console.log('Error: ' + err);
        }

        // Figure out which datasets from the database have a local RNC panel
        _.chain(datasetList).sortBy(function (dataset) {
            return -dataset.createTime;
        }).each(function (dataset, index) {
            var outputLine = index + ': ' + dataset.id;
            if (panelList.indexOf(dataset.id) !== -1) {
                outputLine += ' +++ ';
                uploadableDatasets.push(dataset);
            } else {
                outputLine += '     ';
                unmigratedDatasets.push(dataset.id);
            }
            outputLine += dataset.title;
            console.log(outputLine);

        });

        callback(null, uploadableDatasets, unmigratedDatasets);
    });
}


resource.init({
    //cassandraHosts: ["localhost"],
    //cassandraKeyspace: "development"
    "cassandraHosts": nconf.get('cassandraHosts'),
    "cassandraKeyspace": nconf.get('cassandraKeyspace'),
    "cassandraUsername": nconf.get('cassandraUsername'),
    "cassandraPassword": nconf.get('cassandraPassword')
}, function (err) {
    if (err) {
        console.log(err);
    }
    migrateLayouts(function (err, migratedLayouts) {
        migrateUsers(function (err, migratedUsers) {
            getUploadableDatasets(function (err, uploadableDatasets, unmigratedDatasets) {
                loadDatasets(uploadableDatasets, function (err, migratedDatasets) {
                    console.log('Migrated ' + _.size(migratedDatasets) + ' datasets');
                    console.log('Could not migrate ' + unmigratedDatasets.length + ' datasets');
                    migrateVideos(migratedDatasets, function (err, migratedVideos, unmigratedVideos) {
                        migrateComments(migratedDatasets, function (err, migratedComments, unmigratedComments) {
                            migrateEvents(migratedDatasets, function (err, migratedEvents, unmigratedEvents) {
                                process.exit(0);
                            });
                        });
                    });
                });
            });
        });
    });
});


