var spawn = require('child_process').spawn;

//var database = require('./../../support/database');
var log = require('./../../support/logger').log;
var config = require('./../../config');

var datasetResource = require('./../../support/resources/resource/dataset_resource');
var panelResource = require('./../../support/resources/resource/panel_resource');
var summaryStatisticsResource = require('./../../support/resources/resource/summarystatistics_resource');

//var page_uuid_list = {};

/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 *//*
  function generateUUID() {
  function _p8(s) {
  var p = (Math.random().toString(16) + "000000000").substr(2, 8);
  return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
  }
  return (_p8() + _p8(true) + _p8(true) + _p8());
  }*/

/*
 function SocketAvailable(page_uuid) {
 return typeof page_uuid_list[page_uuid] !== "undefined" && page_uuid_list[page_uuid] !== null;
 }
 
 function SendOnSocket(page_uuid, text) {
 if (SocketAvailable(page_uuid) === true) {
 page_uuid_list[page_uuid].emit('note', {text: text});
 }
 }
 
 function SendOnSocketDone(page_uuid) {
 if (SocketAvailable(page_uuid) === true) {
 console.log("Done processing. Redirecting now...");
 page_uuid_list[page_uuid].emit('done_processing', {});
 } else {
 console.log("Could not find a socket to emit redirection...");
 }
 
 delete page_uuid_list[page_uuid];
 }
 
 exports.NewSocket = function(new_socket, socket_page_uuid) {
 if (typeof page_uuid_list[socket_page_uuid] !== "undefined") {
 page_uuid_list[socket_page_uuid] = new_socket;
 SendOnSocket(socket_page_uuid, "found handler!");
 return true;
 } else {
 return false;
 }
 };
 */

/*
 exports.post = function(req, res, next) {
 var dataset = {};
 
 //dataset["filename"] = req.files.file.name;
 //dataset["processing_config"] = req.body.config;
 
 //These should come from rnb2rnt...
 //dataset["scad_unit"] = "unknown";
 
 var filename = req.files.file.name.split(".")[0];
 
 //var page_uuid = generateUUID();
 //page_uuid_list[page_uuid] = null;
 
 var parameters = [];
 parameters.push('-jar');
 parameters.push('bin/parsernc.jar');
 parameters.push('--nodeaddress');
 parameters.push('localhost');
 parameters.push('--input');
 parameters.push(req.files.file.path);
 parameters.push('--uuid');
 parameters.push(dataset["raw_data"]);
 
 var downsample_command = "java";
 for (var i = 0; i < parameters.length; i++) {
 downsample_command += " " + parameters[i];
 }
 log.info("Command: '" + downsample_command + "'");
 
 var rnb2rnt = spawn('java', parameters);
 rnb2rnt.stdout.setEncoding('utf8');
 rnb2rnt.stderr.setEncoding('utf8');
 
 
 var processing_notes = "";
 var data_to_send = "";
 rnb2rnt.stderr.on('data', function(data) {
 processing_notes += data;
 data_to_send += data;
 
 var lines = data_to_send.split("\n");
 while (lines.length > 1) {
 var line = lines.shift();
 if (SocketAvailable(page_uuid) === true) {
 SendOnSocket(page_uuid, line);
 }
 }
 data_to_send = lines[0];
 });
 
 rnb2rnt.on('exit', function(code, signal) {
 
 var processing_output = rnb2rnt.stdout.read();
 var processing_statistics = JSON.parse(processing_output);
 
 dataset["number_rows"] = processing_statistics["rows"];
 dataset["start_time"] = processing_statistics["datasetStartTime"];
 dataset["end_time"] = processing_statistics["datasetEndTime"];
 dataset["scad_unit"] = processing_statistics["unit"].toString();
 dataset["column_titles"] = processing_statistics["columns"];
 
 dataset["name"] = req.body.title;
 if (dataset["name"] === "") {
 dataset["name"] = filename;
 }
 
 dataset["summary_statistics"] = "";
 
 dataset["create_time"] = new Date(Date.now());
 dataset["create_user"] = req.user.id;
 
 dataset["processing_statistics"] = JSON.stringify(processing_statistics);
 dataset["processing_notes"] = processing_notes;
 
 database.createDataset(dataset, function(dataset) {
 SendOnSocketDone(page_uuid);
 });
 });
 
 res.render("processupload", {page_title: "Processing Upload...", uuid: dataset["id"], page_uuid: page_uuid});
 
 };*/

exports.post = function(req, res, next) {
    var filename = req.files.file.name.split(".")[0];

    // First, create a new dataset:
    var title = req.body.title;
    if (title === "") {
        title = filename;
    }

    var newDataset = {
        title: title,
        owner: req.user.id
    };

    datasetResource.createDataset(newDataset, function(err, datasetList) {
        var dataset = datasetList[0];
        var id = dataset.id;

        var datasetUpdate = {
            source:{}
        };

        var parserncParameters = [];
        parserncParameters.push('-jar');
        parserncParameters.push('bin/parsernc.jar');
        parserncParameters.push('--nodeaddress');
        parserncParameters.push('localhost');
        parserncParameters.push('--input');
        parserncParameters.push(req.files.file.path);
        parserncParameters.push('--uuid');
        parserncParameters.push(dataset.panelId);

        var parsernc = spawn('java', parserncParameters);
        parsernc.stdout.setEncoding('utf8');
        parsernc.stderr.setEncoding('utf8');

        res.render('processupload', {page_title: 'Processing', dataset: dataset});

        parsernc.on('exit', function(code, signal) {
            var processingInfo = parsernc.stderr.read();
            var processingStatistics = JSON.parse(parsernc.stdout.read());

            if (code !== 0) {
                console.log('Non zero code! ' + code + ': ' + processingInfo);
            }


            datasetUpdate.axes = processingStatistics.columns;
            datasetUpdate.source.scad = processingStatistics;
            datasetUpdate.source.filename = req.files.file.name;

            panelResource.calculatePanelProperties(dataset.panelId, function(additionalProperties) {
                var startTime = additionalProperties.startTime;
                var endTime = additionalProperties.endTime;
                var rowCount = additionalProperties.rowCount;

                log.debug('startTime: ' + startTime);
                log.debug('endTime: ' + endTime);

                // Integrity check
                if (startTime !== processingStatistics.datasetStartTime) {
                    log.error('Calculated panel start time ' + startTime + ' not equal to given start time ' + processingStatistics.datasetStartTime);
                }
                if (endTime !== processingStatistics.datasetEndTime) {
                    log.error('Calculated panel end time ' + endTime + ' not equal to given end time ' + processingStatistics.datasetEndTime);
                }
                if (rowCount !== processingStatistics.rows) {
                    log.error('Calculated panel rows ' + rowCount + ' not equal to given rows ' + processingStatistics.rows);
                }

                datasetUpdate.startTime = startTime;
                datasetUpdate.endTime = endTime;
                datasetUpdate.rowCount = rowCount;


                datasetResource.updateDataset(id, datasetUpdate, function(err) {
                    if (err) {
                        log.error('RNC Process dataset udate unsucessful: ' + err);
                    }
                }, true);

                summaryStatisticsResource.calculate(id, startTime, endTime, function(statistics) {
                    datasetResource.updateDataset(id, {summaryStatistics: statistics}, function(err) {
                        if (err) {
                            log.error('RNC Process dataset summary statistics update unsuccessful: ' + err);
                        }
                    });
                });

            });

        });


    });
};