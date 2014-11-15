"use strict";

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

var resource = require('../api/resources/index');

var path = require('path');
var async = require('async');

var defaultCreateTime = (new Date()).getTime();


/** Taken from red9resource, and put here for convenience
 * Generates a GUID string, according to RFC4122 standards.
 *
 * Modified by SRLM to generate a version 4 UUID.
 *
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function generateUUID() {
    function _p8() {
        return (Math.random().toString(16) + "000000000").substr(2, 8);
    }

    var setB = _p8();
    var setC = _p8();

    var t = ['8', '9', 'a', 'b'];
    var single = t[Math.floor(Math.random() * t.length)];

    return _p8() + '-' + setB.substr(0, 4) + '-4' + setB.substr(4, 3) + '-'
        + single + setC.substr(0, 3) + '-' + setC.substr(4, 4) + _p8();
}

function adjustId(idMap, oldId) {
    var newId = generateUUID();
    idMap[oldId] = newId;
    return newId;
}

var idMap = {
    layout: {},
    user: {},
    dataset: {},
    event: {},
    comment: {},
    video: {}
};


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

        // Key change from "owner" to "ownerId"
        oldDataset.ownerId = idMap.user[oldDataset.owner];
        oldDataset.id = adjustId(idMap.dataset, oldDataset.id);

        resource.helpers.createDataset(oldDataset, readStream, function (err, createdDataset) {
            if (err) {
                callback(err);
            } else {
                if (!_.has(createdDataset, 'startTime') || !_.has(createdDataset, 'endTime')) {
                    console.log('ERROR: dataset ' + createdDataset.id + ' missing startTime or endTime');
                    process.exit(1);
                }

                migratedDatasets[oldDataset.id] = {
                    old: oldDataset,
                    new: createdDataset
                };
                process.nextTick(callback);
            }
        }, true);
    }

    async.eachLimit(datasetList, nconf.get('asyncLimit'), loadDataset, function (err) {
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
                layout.createTime = defaultCreateTime;
                layout.id = adjustId(idMap.layout, layout.id);

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

// TODO: SRLM: For some reason user preferred_layouts is not migrated.
function migrateUsers(doneCallback) {
    var migratedUsers = [];
    request({
        url: 'http://api.redninesensor.com/user/',
        json: true
    }, function (err, response, userList) {
        async.eachLimit(userList, 20,
            function (user, callback) {
                user.createTime = defaultCreateTime;
                user.id = adjustId(idMap.user, user.id);

                // map from the old layout id's to the new layout id's.
                user.preferredLayout = _.reduce(user.preferredLayout, function (memo, value, key) {
                    memo[key] = idMap.layout[value];
                    return memo;
                }, {});

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

                // Key change from "dataset" to "datasetId"
                video.datasetId = idMap.dataset[video.dataset];
                delete video.dataset;

                if (_.has(datasets, video.datasetId)) {
                    // update id here because we only want to change it if we can successfully migrate.
                    video.id = adjustId(idMap.video, video.id);


                    video.startTime = mapTime(datasets[video.datasetId].new.startTime,
                        datasets[video.datasetId].old.headPanel.startTime,
                        video.startTime);
                    video.datasetId = datasets[video.datasetId].new.id;

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

                // Key change from "resource" to "resourceId"
                comment.resourceId = idMap.dataset[comment.resource];
                comment.authorId = idMap.user[comment.author];
                delete comment.resource;

                if (_.has(datasets, comment.resourceId)) {
                    comment.id = adjustId(idMap.comment, comment.id);


                    if (comment.startTime !== 0) {
                        comment.startTime = mapTime(datasets[comment.resourceId].new.startTime,
                            datasets[comment.resourceId].old.headPanel.startTime,
                            comment.startTime);
                    }
                    if (comment.endTime !== 0) {
                        comment.endTime = mapTime(datasets[comment.resourceId].new.startTime,
                            datasets[comment.resourceId].old.headPanel.startTime,
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
        async.eachLimit(eventList, nconf.get('asyncLimit'),
            function (event, callback) {
                event.createTime = defaultCreateTime;
                event.datasetId = idMap.dataset[event.datasetId];

                if (_.has(datasets, event.datasetId)) {
                    event.id = adjustId(idMap.event, event.id);
                    event.startTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.headPanel.startTime,
                        event.startTime);
                    event.endTime = mapTime(datasets[event.datasetId].new.startTime,
                        datasets[event.datasetId].old.headPanel.startTime,
                        event.endTime);

                    var temp = event.type.split(': ');
                    if(temp.length === 2){
                        event.type = temp[0];
                        event.subtype = temp[1];
                    }

                    resource.event.create(event, function (err, createdEvent) {
                        if (err) {
                            console.log('Could not migrate event ' + event.id + ': ' + err);
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
    "cassandraHosts": nconf.get('cassandraHosts'),
    "cassandraKeyspace": nconf.get('cassandraKeyspace'),
    "cassandraUsername": nconf.get('cassandraUsername'),
    "cassandraPassword": nconf.get('cassandraPassword'),
    dataPath: nconf.get('panelDataPath')
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

                                fs.writeFileSync(nconf.get('migrationMapPath'), JSON.stringify(idMap, null, 4), {flag: 'w'});
                                process.exit(0);
                            });
                        });
                    });
                });
            });
        });
    });
});


