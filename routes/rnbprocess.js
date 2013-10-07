var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var fs = require('fs');

var database = require('./../support/database');
var database2 = require('./../support/database').database;

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

    var page_uuid = guid();
    page_uuid_list[page_uuid] = null;

    var raw_data_uuid = guid();
    var dataset_uuid = guid();
    var start_time;
    var end_time;
    var row_count;
    var scad_unit = "unknown";

    var filename = req.files.rnbfile.name.split(".")[0];
    var filename_with_extension = req.files.rnbfile.name;

    var meta_filename = '/tmp/rnb2rnt/' + filename + '-meta.txt';

    var parameters = [];
    parameters.push('-jar');
    parameters.push('rnb2rnt-server.jar');
    parameters.push('--nodeaddress');
    parameters.push('localhost');
    parameters.push('--input');
    parameters.push(req.files.rnbfile.path);
    parameters.push('--uuid');
    parameters.push(raw_data_uuid);
    parameters.push('-m');
    parameters.push(meta_filename);


    var command = "java";
    for (var i = 0; i < parameters.length; i++) {
        command += " " + parameters[i];
    }
    log.info("Command: '" + command + "'");

    //TODO(SRLM): Add crossSection parameter and configuration parameter



    log.info("Starting to Convert " + filename);
    exec("mkdir -p /tmp/rnb2rnt; rm -f /tmp/rnb2rnt/" + filename + "*", function(rm_err, rm_stdout, rm_stderr) {
        var rnb2rnt = spawn('java', parameters);
        rnb2rnt.stdout.setEncoding('utf8');
        rnb2rnt.stderr.setEncoding('utf8');


        var processing_notes = "";

        rnb2rnt.stderr.on('data', function(data) {
            processing_notes += data;
            if (SocketAvailable(page_uuid) === true) {
                SendOnSocket(page_uuid, data);
            }
        });



        rnb2rnt.on('exit', function(code, signal) {

            var processing_statistics = rnb2rnt.stdout.read();

            //SendOnSocket(page_uuid, rnb2rnt.stderr.read());


            var lines = processing_statistics.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var parts = lines[i].split(':', 2);

                var key = parts[0];
                var value = parts[1];

                if (key === "row_count") {
                    row_count = parseInt(value);
                } else if (key === "start_time") {
                    start_time = new Date(parseInt(value));
                } else if (key === "end_time") {
                    end_time = new Date(parseInt(value));
                } else if (key === "scad_unit") {
                    scad_unit = value;
                } else {
                    log.warn("Warning: rnb2rnt-server.jar: Could not parse key '" + key + "', value '" + value + "'");
                }


            }

            GetMetadata(meta_filename, function(metadata) {
                //StoreFileInDatabase(raw_data_uuid, panel_filename, function(start_time, end_time) {                    
                var videos = [];
                if (typeof req.body.video_url !== "undefined" && req.body.video_url !== "") {
                    videos.push(req.body.video_url);
                }

                var title = req.body.title;
                if (title === "") {
                    title = filename;
                }
                var create_dataset_command = "INSERT INTO dataset"
                        + "(id, data, name, submit_date, submit_user, start_time, end_time, processing_config, processing_statistics, processing_notes, metadata, video, event_type, description, filename, number_rows, scad_unit, column_titles)"
                        + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                var data = [];
                data.push(dataset_uuid);
                data.push(raw_data_uuid);
                data.push(title);
                data.push({hint: 'timestamp', value: Date.now()}); //TODO(SRLM): This won't give the submit date/time relative to user!
                data.push(req.user.id);
                data.push({hint: 'timestamp', value: start_time});
                data.push({hint: 'timestamp', value: end_time});
                data.push(req.body.config);
                data.push(processing_statistics);
                data.push(processing_notes);
                data.push(metadata.toString());
                data.push(videos);
                data.push(req.body.event_type);
                data.push(req.body.description);
                data.push(filename_with_extension);
                data.push(row_count);
                data.push(scad_unit);
                data.push(database.getDefaultRawDataColumnTitles());

                console.log("Getting ready to store dataset...");

                database2.executeAsPrepared(create_dataset_command, data, function(err) {
                    if (err) {
                        console.log("Database error: ", err);
                    } else {
                        console.log("Done storing " + dataset_uuid + " in database");
                    }
                    SendOnSocketDone(page_uuid);
                });
            });
        });
    });




    res.render("upload_delay", {uuid: dataset_uuid, page_uuid: page_uuid});

};
