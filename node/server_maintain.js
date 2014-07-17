/** Contains one time use routines to upgrade/modify core components of the website.
 * 
 * This file is a holder for all sorts of routines that only need to be used 
 * once. After that they're done. Typical uses include upgrading a database to
 * a newer schema.
 * 
 */

var underscore = require('underscore')._;
var async = require('async');
var config = require('./config');
config.ProcessCommandLine();
// Logging setup
var logger = requireFromRoot('support/logger');
logger.init('maintain', '0');
var log = logger.log; // console.log replacement
log.info("Maintain Node.js process started.");
//----------------------------------------------------------------------
//MoveDatasetPanelMetaToPanelList();
//createRawDataMetaTable();
//updateEventsWithSource();
//updateSourceToCreateTimeKey();
//addTimezoneToPanels();
addCountsToDataset();
//----------------------------------------------------------------------


function addCountsToDataset() {
    var cassandraClient = require('node-cassandra-cql').Client;
    var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});
    var eventResource = requireFromRoot('support/resources/event');
    var videoResource = requireFromRoot('support/resources/video');
    var commentResource = requireFromRoot('support/resources/comment');
    var datasetResource = requireFromRoot('support/resources/dataset');

    function setCounter(name, datasetId, count, doneCallback) {
        var command = 'UPDATE dataset_counter SET ' + name + ' = ' + name + ' + 1 WHERE id = ' + datasetId + ';';
        async.timesSeries(count, function(n, next) {
            cassandraDatabase.execute(command, [], function(err) {
                if (err) {
                    log.error(err);
                }
                next();
            });
        }, function() {
            doneCallback();
        });
    }

    function setCounterToZero(name, datasetId, doneCallback) {
        setCounter(name, datasetId, 1, function() {
            var command = 'UPDATE dataset_counter SET ' + name + ' = ' + name + ' - 1 WHERE id = ' + datasetId + ';';
            cassandraDatabase.execute(command, [], function(err) {
                if (err) {
                    log.error(err);
                }
                doneCallback();
            });
        });
    }



    datasetResource.get({}, function(datasets) {
        async.eachSeries(datasets,
                function(dataset, datasetDoneCallback) {
                    async.waterfall([
                        function(callback) {
                            eventResource.get({datasetId: dataset.id}, function(events) {
                                console.log('Updating events (' + events.length + ')');
                                if (events.length > 0) {
                                    setCounter('event_counter', dataset.id, events.length, callback);
                                } else {
                                    setCounterToZero('event_counter', dataset.id, callback);
                                }
                            });
                        },
                        function(callback) {
                            console.log('Getting video');
                            videoResource.get({dataset: dataset.id}, function(videos) {
                                console.log('Updating videos (' + videos.length + ')');
                                if (videos.length > 0) {
                                    setCounter('video_counter', dataset.id, videos.length, callback);
                                } else {
                                    setCounterToZero('video_counter', dataset.id, callback);
                                }
                            });
                        },
                        function(callback) {
                            console.log('Getting comments');
                            commentResource.get({resource: dataset.id}, function(comments) {
                                console.log('Updating comments (' + comments.length + ')');
                                if (comments.length > 0) {
                                    setCounter('comment_counter', dataset.id, comments.length, callback);
                                } else {
                                    setCounterToZero('comment_counter', dataset.id, callback);
                                }
                            });
                        }
                    ], function(err) {
                        console.log('Dataset done...');
                        datasetDoneCallback();
                    });
                },
                function() {
                    log.info('All done.');
                });
    });
}

function addTimezoneToPanels() {
    var panelResource = requireFromRoot('support/resources/panel');
    panelResource.get({}, function(panels) {
        async.eachSeries(panels, function(panel, callback) {
            panelResource.update(panel.id, {timezone: 'America/Los_Angeles'}, function() {
                callback();
            });
        }, function() {
            console.log('All Done.');
        });
    });
}

function updateSourceToCreateTimeKey() {
    var eventResource = requireFromRoot('support/resources/event');
    eventResource.get({}, function(events) {
        underscore.each(events, function(event, index) {
            var source = event.source;
            source.createTime = source.creationTime;
            delete source.creationTime;
            eventResource.update(event.id, {source: source}, function() {
                if (index === events.length - 1) {
                    console.log('All done.');
                }
            });
        });

    });

}

function updateEventsWithSource() {
    var eventResource = requireFromRoot('support/resources/event');

    var defaultSource = {
        type: 'manual',
        creationTime: (new Date()).getTime(), // Overwritten in pre
        algorithm: 'manual',
        parameters: {}
    };

    eventResource.get({}, function(events) {
        underscore.each(events, function(event) {
            eventResource.update(event.id, {source: defaultSource}, function() {
                console.log('Updated ' + event.id);
            });
        });
    });

}


function createRawDataMetaTable() {
    var panelResource = requireFromRoot('support/resources/panel');
    var datasetResource = requireFromRoot('support/resources/dataset');
    var cassandraClient = require('node-cassandra-cql').Client;
    var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});
    var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');
    datasetResource.get({}, function(datasets) {
        console.log('Updating ' + datasets.length + ' datasets');
        async.eachLimit(datasets, 4, function(dataset, callback) {
            console.log('Calculating panel properties of ' + dataset.headPanelId + ' and createTime of ' + dataset.createTime);
            panelResource.calculatePanelProperties(dataset.headPanelId,
                    function(err, properties) {

                        console.log('Properties calculated.');
                        var newRow = [
                            dataset.headPanelId,
                            dataset.id,
                            {value: new Date(), hint: 'timestamp'},
                            [
                                "gps:latitude",
                                "gps:longitude",
                                "gps:altitude",
                                "gps:speed",
                                "gps:satellite",
                                "gps:hdop",
                                "gps:magneticvariation",
                                "gps:date",
                                "gps:time",
                                "rotationrate:x",
                                "rotationrate:y",
                                "rotationrate:z",
                                "magneticfield:x",
                                "magneticfield:y",
                                "magneticfield:z",
                                "pressure:pressure",
                                "pressure:temperature",
                                "acceleration:x",
                                "acceleration:y",
                                "acceleration:z"
                            ],
                            {value: new Date(properties.startTime), hint: 'timestamp'},
                            {value: new Date(properties.endTime), hint: 'timestamp'},
                            JSON.stringify({})
                        ];
                        //console.log("New row: " + JSON.stringify(newRow));

                        var query = "INSERT INTO raw_data_meta(id, dataset_id, create_time, columns,start_time,end_time, summary_statistics) VALUES (?,?,?,?,?,?,?)";
                        cassandraDatabase.execute(query, newRow, function(err) {
                            summaryStatisticsResource.calculate(dataset.headPanelId, properties.startTime, properties.endTime, function(summaryStatistics) {

                                var query2 = "INSERT INTO raw_data_meta(summary_statistics) VALUES (?)";
                                var newRow2 = [JSON.stringify(summaryStatistics)];

                                cassandraDatabase.execute(query2, newRow2, function(err2) {
                                    if (err) {
                                        console.log('Error updating raw data meta: ' + err);
                                    } else {
                                        console.log('Updated dataset ' + dataset.id);
                                    }
                                    callback();
                                });
                            });
                        });
                    });

        }, function(err) {
            console.log('All done');
        });
    });
}
;
function MoveDatasetPanelMetaToPanelList() {


    var panelResource = requireFromRoot('support/resources/panel');
    var datasetResource = requireFromRoot('support/resources/dataset');
// note: requires editing mapToResource so that it doesn't read from dataset.panels...
    datasetResource.get({}, function(datasets) {
        console.log('Updating ' + datasets.length + ' datasets');
        async.eachSeries(datasets, function(dataset, callback) {
            console.log('Calculating panel properties of ' + dataset.headPanelId + ' and createTime of ' + dataset.createTime);
            panelResource.calculatePanelProperties(dataset.headPanelId,
                    function(err, properties) {
                        console.log('Properties calculated.');
                        dataset.panels = {};
                        dataset.panels[dataset.headPanelId] =
                                {
                                    startTime: properties.startTime,
                                    endTime: properties.endTime,
                                    axes: [
                                        "gps:latitude",
                                        "gps:longitude",
                                        "gps:altitude",
                                        "gps:speed",
                                        "gps:satellite",
                                        "gps:hdop",
                                        "gps:magneticvariation",
                                        "gps:date",
                                        "gps:time",
                                        "rotationrate:x",
                                        "rotationrate:y",
                                        "rotationrate:z",
                                        "magneticfield:x",
                                        "magneticfield:y",
                                        "magneticfield:z",
                                        "pressure:pressure",
                                        "pressure:temperature",
                                        "acceleration:x",
                                        "acceleration:y",
                                        "acceleration:z"
                                    ],
                                    temporary: false,
                                    parent: null
                                };
                        datasetResource.update(
                                dataset.id,
                                {panels: dataset.panels},
                        function(err) {
                            if (err) {
                                console.log('Error updating dataset: ' + err);
                            } else {
                                console.log('Updated dataset ' + dataset.id);
                            }
                            callback();
                        });
                    });
        }, function(err) {
            console.log('All done');
        });
    });
}
