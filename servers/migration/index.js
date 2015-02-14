'use strict';

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('migration', {file: 'config/' + process.env.NODE_ENV + '.json'})
    .file('api', {file: '../api/config/' + process.env.NODE_ENV + '.json'});

var panelInputDir = nconf.get('panelInputDir');

console.log('panelDataPath: ' + nconf.get('panelDataPath'));

var models = require('../api/models');

var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');

var defaultCreateTime = (new Date()).getTime();

var idMap = {
    layout: {},
    user: {},
    dataset: {},
    event: {},
    comment: {},
    video: {}
};

// TODO(SRLM): Add check to make sure that GET requests go through without error.

// TODO(SRLM): User profile migration needs work (special fields)

var requestHeaders = {
    Cookie: nconf.get('cookie') // Should be of format --cookie r9session=Fe26.2**f260f...
};


/**
 *
 * @param datasetList
 * @param callback {err, datasetIdMap}
 */
function loadDatasets(datasetList, doneCallback) {
    var migratedDatasets = {};

    var panel = require('../api/support/panel');
    panel.init(nconf);

    function loadDataset(oldDataset, callback) {
        console.log('Uploading ' + oldDataset.id);
        var readStream = fs.createReadStream(path.join(panelInputDir, oldDataset.id + '.upload.RNC'));

        oldDataset.userId = idMap.user[oldDataset.userId];

        var oldId = oldDataset.id;
        delete oldDataset.id;

        var newDataset = {
            userId: oldDataset.userId,
            title: oldDataset.title,
            sport: oldDataset.sport
        };

        panel.create(null, models, newDataset, readStream, function (err, createdDataset) {
            if (err) {
                console.log('Panel create error: ' + err);
                console.log(err.stack);
                console.log(err);
                callback(err);
            } else {
                idMap.dataset[oldId] = createdDataset.id;

                // Make sure that we copy the tags over...
                createdDataset.tags = oldDataset.tags;
                createdDataset.save();

                migratedDatasets[createdDataset.id] = {
                    old: oldDataset,
                    new: createdDataset
                };
                setImmediate(callback);
            }
        }, true);
    }

    async.eachSeries(datasetList, loadDataset, function (err) {
        doneCallback(err, migratedDatasets);
    });
}

function mapTime(newDatasetStart, oldDatasetStart, oldTime) {
    return newDatasetStart + (oldTime - oldDatasetStart);
}


function migrateLayouts(doneCallback) {
    var migratedLayouts = [];
    request({
        url: 'http://api.redninesensor.com/layout/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, layoutList) {

        layoutList = _.sortBy(layoutList, 'createTime');

        async.eachSeries(layoutList,
            function (layout, callback) {

                //console.log('Migrating layout: ' + layout);
                var oldId = layout.id;
                delete layout.id;
                //console.dir(Object.keys(models));
                models.layout.create(layout)
                    .then(function (createdLayout) {
                        idMap.layout[oldId] = createdLayout.id;
                        migratedLayouts.push(createdLayout.id);
                    })
                    .catch(function (err) {
                        console.log('Migrate layouts error: ' + err);
                    })
                    .finally(function () {
                        setImmediate(callback);
                    });

            }, function (err) {
                console.log('Migrated ' + _.size(migratedLayouts) + ' layouts');
                doneCallback(null, migratedLayouts);
            });
    });
}

// TODO: SRLM: For some reason user preferred_layouts is not migrated.
function migrateUsers(doneCallback) {
    var migratedUsers = [];
    request({
        url: 'http://api.redninesensor.com/user/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, userList) {

        // A bit of a vanity list here... Give the single digit IDs to core people.
        var priorities = {
            'srlm@srlmproductions.com': 1,
            'mike.olson@redninesensor.com': 2,
            'mica.parks@redninesensor.com': 3,
            'jeff.olson@redninesensor.com': 4,
            'akhil.rao@redninesensor.com': 5,
            'shyama.dorbala@redninesensor.com': 6,
            'jaysen.kim@redninesensor.com': 7,
            'merwan.rodriguez@redninesensor.com': 8,
            'juan.bobillo@redninesensor.com': 9,
            'paul.olson@redninesensor.com': 10
        };

        userList = _.sortBy(userList, 'createTime');
        userList = _.sortBy(userList, function (user) {
            if (priorities.hasOwnProperty(user.email)) {
                return priorities[user.email];
            } else {
                return 999;
            }
        });

        async.eachSeries(userList,
            function (user, callback) {
                var oldId = user.id;
                delete user.id;

                // map from the old layout id's to the new layout id's.
                user.preferredLayout = _.reduce(user.preferredLayout, function (memo, value, key) {
                    memo[key] = idMap.layout[value];
                    return memo;
                }, {});

                models.user
                    .create(user)
                    .then(function (createdUser) {
                        idMap.user[oldId] = createdUser.id;
                        migratedUsers.push(createdUser.id);
                    })
                    .catch(function (err) {
                        console.log('Migrate users error: ' + err);
                    })
                    .finally(function () {
                        setImmediate(callback);
                    });
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
        url: 'http://api.redninesensor.com/video/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, videoList) {

        videoList = _.sortBy(videoList, 'createTime');

        async.eachSeries(videoList,
            function (video, callback) {
                if (_.has(idMap.dataset, video.datasetId)) {

                    video.datasetId = idMap.dataset[video.datasetId];

                    var oldId = video.id;
                    delete video.id;

                    video.startTime = mapTime(datasets[video.datasetId].new.startTime,
                        datasets[video.datasetId].old.startTime,
                        video.startTime);
                    video.datasetId = datasets[video.datasetId].new.id;

                    models.video
                        .create(video)
                        .then(function (createdVideo) {
                            idMap.video[oldId] = createdVideo.id;
                            migratedVideos.push(createdVideo.id);
                        })
                        .catch(function (err) {
                            console.log('Migrate videos error: ' + err);
                        })
                        .finally(function () {
                            setImmediate(callback);
                        });
                } else {
                    unmigratedVideos.push(video.id);
                    setImmediate(callback);
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
        url: 'http://api.redninesensor.com/comment/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, commentList) {

        commentList = _.sortBy(commentList, 'createTime');

        async.eachSeries(commentList,
            function (comment, callback) {

                comment.datasetId = idMap.dataset[comment.datasetId];

                if (_.has(datasets, comment.datasetId)) {

                    var oldId = comment.id;
                    delete comment.id;

                    comment.userId = idMap.user[comment.userId];

                    if (comment.startTime !== 0) {
                        comment.startTime = mapTime(datasets[comment.datasetId].new.startTime,
                            datasets[comment.datasetId].old.startTime,
                            comment.startTime);
                    }
                    if (comment.endTime !== 0) {
                        comment.endTime = mapTime(datasets[comment.datasetId].new.startTime,
                            datasets[comment.datasetId].old.startTime,
                            comment.endTime);
                    }

                    models.comment
                        .create(comment)
                        .then(function (createdComment) {
                            idMap.comment[oldId] = createdComment.id;
                            migratedComments.push(createdComment.id);
                        })
                        .catch(function (err) {
                            console.log('Migrate comments error: ' + err);
                        })
                        .finally(function () {
                            setImmediate(callback);
                        });
                } else {
                    unmigratedComments.push(comment.id);
                    setImmediate(callback);
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
        url: 'http://api.redninesensor.com/event/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, eventList) {

        eventList = _.sortBy(eventList, 'createTime');

        async.eachLimit(eventList, 10,
            function (event, callback) {

                event.datasetId = idMap.dataset[event.datasetId];

                if (_.has(datasets, event.datasetId)) {
                    var oldId = event.id;
                    delete event.id;

                    event.startTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.startTime,
                        event.startTime);
                    event.endTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.startTime,
                        event.endTime);

                    models.event
                        .create(event)
                        .then(function (createdEvent) {
                            idMap.event[oldId] = createdEvent.id;
                            migratedEvents.push(createdEvent.id);
                            console.log('Migrated event ' + createdEvent.id);
                        })
                        .catch(function (err) {
                            console.log('Could not migrate event ' + event.id + ': ' + err);
                        })
                        .finally(function () {
                            setImmediate(callback);
                        });
                } else {
                    unmigratedEvents.push(event.id);
                    setImmediate(callback);
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
        url: 'http://api.redninesensor.com/dataset/?metaformat=none',
        headers: requestHeaders,
        json: true
    }, function (err, response, datasetList) {
        if (err) {
            console.log('Get uploadable datasets error: ' + err);
        }

        // Figure out which datasets from the database have a local RNC panel
        _.chain(datasetList).sortBy(function (dataset) {
            return dataset.createTime;
        }).each(function (dataset, index) {
            var outputLine = index + ': ' + dataset.id;
            if (panelList.indexOf(dataset.id + '') !== -1) {
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

// Need to set timeout for remote server, since there isn't enough time from the instant
// that the tables are created until we start bombarding it with requests.
models.init(nconf, function () {
    setTimeout(function () {
        migrateLayouts(function (err, migratedLayouts) {
            migrateUsers(function (err, migratedUsers) {
                getUploadableDatasets(function (err, uploadableDatasets, unmigratedDatasets) {
                    loadDatasets(uploadableDatasets, function (err, migratedDatasets) {
                        console.log('Migrated ' + _.size(migratedDatasets) + ' datasets');
                        console.log('Could not migrate ' + unmigratedDatasets.length + ' datasets');
                        migrateVideos(migratedDatasets, function (err, migratedVideos, unmigratedVideos) {
                            migrateComments(migratedDatasets, function (err, migratedComments, unmigratedComments) {
                                migrateEvents(migratedDatasets, function (err, migratedEvents, unmigratedEvents) {
                                    fs.writeFileSync(nconf.get('migrationMapPath'), JSON.stringify(idMap, null, 4), {flag: 'w'});
                                    process.exit(0);
                                });
                            });
                        });
                    });
                });
            });
        });
    }, 5000);
});


