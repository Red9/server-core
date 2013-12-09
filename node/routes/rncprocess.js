var spawn = require('child_process').spawn;

var database = require('./../support/database');
var log = require('./../support/logger').log;
var config = require('./../config');
var externals = require('./../support/externals');

var page_uuid_list = {};


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
    }else{
        return false;
    }
};



exports.post = function(req, res) {



    var dataset = {};
    dataset["raw_data"] = database.GenerateUUID();
    dataset["id"] = database.GenerateUUID();
    dataset["event_tree"] = database.GenerateUUID();

    dataset["filename"] = req.files.file.name;
    dataset["processing_config"] = req.body.config;

    //These should come from rnb2rnt...
    dataset["scad_unit"] = "unknown";

    var filename = req.files.file.name.split(".")[0];

    var page_uuid = database.GenerateUUID();
    page_uuid_list[page_uuid] = null;

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
    log.info("Command: '" + downsample_command + "'", req);

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

        database.InsertRow("dataset", dataset, function(err) {
            var event = {};
            event["id"] = dataset["event_tree"];
            event["dataset"] = dataset["id"];
            event["start_time"] = dataset["start_time"];
            event["end_time"] = dataset["end_time"];
            event["confidence"] = 100;
            event["children"] = {hint: "list", value: []};
            event["type"] = "recording";
            event["summary_statistics"] = "";
            event["source"] = "dataset";
            event["create_time"] = dataset["create_time"];
            database.InsertRow("event", event, function(err) {
                SendOnSocketDone(page_uuid);
            });
            externals.BeginStatisticsCalculation(event['id']);
            
        });
    });

    res.render("processupload", {page_title: "Processing Upload...", uuid: dataset["id"], page_uuid: page_uuid});

};
