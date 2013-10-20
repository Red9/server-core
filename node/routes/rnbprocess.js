var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var fs = require('fs');

var database = require('./../support/database');

var log = require('./../support/logger').log;

var page_uuid_list = {};





/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function guid() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return _p8() + _p8(true) + _p8(true) + _p8();
}


var database_error_callback = function(err) {
    if (err) {
        log.err(err);
    }
};

function GetMetadata(meta_filename, callback) {
    fs.readFile(meta_filename, function(err, metadata) {
        if (err) {
            log.err("Error: ", err);
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
    dataset["raw_data_uuid"] = guid();
    dataset["dataset_uuid"] = guid();

    dataset["filename_with_extension"] = req.files.rnbfile.name;
    dataset["processing_config"] = req.body.config;
    dataset["type"] = req.body.event_type;
    dataset["description"] = req.body.description;

    //These should come from rnb2rnt...
    dataset["scad_unit"] = "unknown";



    var filename = req.files.rnbfile.name.split(".")[0];

    var meta_filename = '/tmp/rnb2rnt/' + filename + '-meta.txt';
    var cfg_filename = '/tmp/rnb2rnt/' + dataset["dataset_uuid"] + '-cfg.txt';




    var page_uuid = guid();
    page_uuid_list[page_uuid] = null;



    var parameters = [];
    parameters.push('-jar');
    parameters.push('rnb2rnt-server.jar');
    parameters.push('--nodeaddress');
    parameters.push('localhost');
    parameters.push('--input');
    parameters.push(req.files.rnbfile.path);
    parameters.push('--uuid');
    parameters.push(dataset["raw_data_uuid"]);
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

        //TODO(SRLM): Add crossSection parameter and configuration parameter

        exec("mkdir -p /tmp/rnb2rnt; rm -f /tmp/rnb2rnt/" + filename + "*", function(rm_err, rm_stdout, rm_stderr) {
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


                var lines = processing_statistics.split('\n');
                for (var i = 0; i < lines.length; i++) {
                    var parts = lines[i].split(':', 2);

                    var key = parts[0];
                    var value = parts[1];

                    if (key === "row_count") {
                        dataset["row_count"] = parseInt(value);
                    } else if (key === "start_time") {
                        dataset["start_time"] = new Date(parseInt(value));
                    } else if (key === "end_time") {
                        dataset["end_time"] = new Date(parseInt(value));
                    } else if (key === "scad_unit") {
                        dataset["scad_unit"] = value;
                    } else if (key === "column_titles") {
                        dataset["column_titles"] = value.split(",");
                    } else {
                        log.warn("Warning: rnb2rnt-server.jar: Could not parse key '" + key + "', value '" + value + "'");
                    }
                }

                GetMetadata(meta_filename, function(metadata) {
                    //StoreFileInDatabase(raw_data_uuid, panel_filename, function(start_time, end_time) {                    
                    dataset["videos"] = [];
                    if (typeof req.body.video_url !== "undefined" && req.body.video_url !== "") {
                        dataset["videos"].push(req.body.video_url);
                    }



                    dataset["title"] = req.body.title;
                    if (dataset["title"] === "") {
                        dataset["title"] = filename;
                    }

                    dataset["metadata"] = metadata.toString();

                    dataset["submit_time"] = new Date(Date.now());
                    dataset["submit_user"] = req.user.id;

                    dataset["processing_statistics"] = processing_statistics;
                    dataset["processing_notes"] = processing_notes;

                    database.InsertDataset(dataset, function(err) {
                        if (err) {

                        } else {

                        }
                        SendOnSocketDone(page_uuid);
                    });
                });
            });
        });
    });


    res.render("rnbprocess", {uuid: dataset["dataset_uuid"], page_uuid: page_uuid});

};
