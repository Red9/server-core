var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var fs = require('fs');

var database = require('./../support/database');
var log = require('./../support/logger').log;
var config = require('./../config');

var page_uuid_list = {};

function GetMetadata(meta_filename, callback) {
    fs.readFile(meta_filename, function(err, metadata) {
        if (err) {
            log.error("Error: ", err);
        } else {
            callback(metadata);
        }
    });
}


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
    log.info("Does rnbprocess have a page_uuid handler?");
    if (typeof page_uuid_list[socket_page_uuid] !== "undefined") {
        log.info("Yes!");
        page_uuid_list[socket_page_uuid] = new_socket;
        SendOnSocket(socket_page_uuid, "found handler!");
    }
};


exports.post = function(req, res) {


    var dataset = {};
    dataset["raw_data"] = database.GenerateUUID();
    dataset["id"] = database.GenerateUUID();
    dataset["event_tree"] = database.GenerateUUID();

    dataset["filename"] = req.files.rnbfile.name;
    dataset["processing_config"] = req.body.config;

    //These should come from rnb2rnt...
    dataset["scad_unit"] = "unknown";


    var filename = req.files.rnbfile.name.split(".")[0];

    var meta_filename = config.tempDirectory + filename + '-meta.txt';
    var cfg_filename = config.tempDirectory + dataset["id"] + '-cfg.txt';


    var page_uuid = database.GenerateUUID();
    page_uuid_list[page_uuid] = null;

    var parameters = [];
    parameters.push('-jar');
    parameters.push('bin/rnb2rnt-server.jar');
    parameters.push('--nodeaddress');
    parameters.push('localhost');
    parameters.push('--input');
    parameters.push(req.files.rnbfile.path);
    parameters.push('--uuid');
    parameters.push(dataset["raw_data"]);
    parameters.push('-m');
    parameters.push(meta_filename);

    if (req.body.cross_section_frequency !== "") {
        var temp = parseInt(req.body.cross_section_frequency);
        if (temp !== "undefined") {
            if (temp > 1000 || temp < 1) {
                log.info("Cross section frequency of " + temp + " is out of range!");
            } else {
                parameters.push("--csfrequency");
                parameters.push(temp);
            }
        } else {
            log.info("Could not parse cross_section_frequency of '" + req.body.cross_section_frequency + "'");
        }
    }
    
    console.log("mkdir -p " + config.tempDirectory + "; rm -f " + config.tempDirectory + filename + "*");

    exec("mkdir -p " + config.tempDirectory + "; rm -f " + config.tempDirectory + filename + "*", function(rm_err, rm_stdout, rm_stderr) {
        fs.writeFile(cfg_filename, dataset["processing_config"], function(err) {
            if (err) {
                log.warn("Could not write configuration file!" + err);
            } else {
                parameters.push('--configuration');
                parameters.push(cfg_filename);
            }

            var downsample_command = "java";
            for (var i = 0; i < parameters.length; i++) {
                downsample_command += " " + parameters[i];
            }
            log.info("Command: '" + downsample_command + "'");

            //TODO(SRLM): Add crossSection parameter

            


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
                var processing_statistics = rnb2rnt.stdout.read();
                
                // For some reason, processing_statistics was null. This happened when reading a large file. Relevant?
                if(processing_statistics === null){
                    processing_statistics = "";
                }
                

                var lines = processing_statistics.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var parts = lines[i].split(':', 2);

                    var key = parts[0];
                    var value = parts[1];

                    if (key === "row_count") {
                        dataset["number_rows"] = parseInt(value);
                    } else if (key === "start_time") {
                        dataset["start_time"] = new Date(parseInt(value));
                    } else if (key === "end_time") {
                        dataset["end_time"] = new Date(parseInt(value));
                    } else if (key === "scad_unit") {
                        dataset["scad_unit"] = value;
                    } else if (key === "column_titles") {
                        dataset["column_titles"] = value.split(",");
                    } else if (key === "") {
                        // do nothing if empty.
                    } else {
                        log.warn("Warning: rnb2rnt-server.jar: Could not parse key '" + key + "', value '" + value + "'");
                    }
                }

                GetMetadata(meta_filename, function(metadata) {
                    dataset["name"] = req.body.title;
                    if (dataset["name"] === "") {
                        dataset["name"] = filename;
                    }

                    dataset["summary_statistics"] = metadata.toString();

                    dataset["create_time"] = new Date(Date.now());
                    dataset["create_user"] = req.user.id;

                    dataset["processing_statistics"] = processing_statistics;
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
                        event["parameters"] = {hint: "map", value: {}};
                        event["source"] = "dataset";
                        event["create_time"] = dataset["create_time"];
                        database.InsertRow("event", event, function(err) {
                            SendOnSocketDone(page_uuid);
                        });
                    });
                });
            });
        });
    });


    res.render("rnbprocess", {page_title: "Processing Upload...", uuid: dataset["id"], page_uuid: page_uuid});

};
