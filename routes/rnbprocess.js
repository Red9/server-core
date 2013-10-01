var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var fs = require('fs');
var lazy = require('lazy');

database = require('./../support/database').database;


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
        console.log(err);
    }
};

// 135769

function StoreFileInDatabase(my_uuid, panel_filename, callback) {
    var firstLine = true;

    var start_time, end_time;

    var lineNumber = 0;
    new lazy(fs.createReadStream(panel_filename)).lines.map(String).forEach(function(line) {
        lineNumber++;

        var columns = line.split(",");
        if (firstLine === false) {
            var time = new Date(parseFloat(columns[0]));

            if (typeof start_time === "undefined") {
                start_time = time;
            }
            end_time = time;

            var data = [];

            for (var i = 1; i < columns.length; i++) {
                data[i - 1] = parseFloat(columns[i]);
            }

            

            database.execute("INSERT INTO raw_data(id, time, data) VALUES (?,?,?)",
                    [my_uuid, time, data],
                    database_error_callback);
        } else {
            firstLine = false;
        }
    }).join(function() {
        callback(start_time, end_time);
    });
}

function GetMetadata(meta_filename, callback) {
    fs.readFile(meta_filename, function(err, metadata) {
        if (err) {
            console.log("Error: ", err);
        } else {
            callback(metadata);
        }
    });
}


exports.post = function(req, res) {


/*
    var output_elements = "";
    if (req.body.outputelement_accl !== undefined) {
        output_elements += "A";
    }
    if (req.body.outputelement_gyro !== undefined) {
        output_elements += "G";
    }
    if (req.body.outputelement_magn !== undefined) {
        output_elements += "M";
    }
    if (req.body.outputelement_fuel !== undefined) {
        output_elements += "F";
    }
    if (req.body.outputelement_gps !== undefined) {
        output_elements += "P";
    }
    if (req.body.outputelement_baro !== undefined) {
        output_elements += "E";
    }*/

    var filename = req.files.rnbfile.name.split(".")[0];

    var panel_filename = '/tmp/rnb2rnt/' + filename + '-panel.txt';
    var meta_filename = '/tmp/rnb2rnt/' + filename + '-meta.txt';

    var parameters = [];
    parameters.push('-jar');
    parameters.push('rnb2rnt.jar');
    parameters.push('-i');
    parameters.push(req.files.rnbfile.path);
    parameters.push('-p');
    parameters.push(panel_filename);
    parameters.push('-m');
    parameters.push('/tmp/rnb2rnt/' + filename + '-meta.txt');

    console.log("crossSection: ", parseInt(req.body.crosssectionfrequency));

   /* if (output_elements !== "") {
        parameters.push('-e');
        parameters.push(output_elements);
        parameters.push('-o');
        parameters.push('/tmp/rnb2rnt/' + filename + '-element.txt');
    }*/

    var raw_data_uuid = guid();
    var dataset_uuid = guid();

    console.log("Starting to Convert " + filename);
    exec("rm -f /tmp/rnb2rnt/" + filename + "*", function(rm_err, rm_stdout, rm_stderr) {
        var process = spawn('java', parameters);
        process.stdout.setEncoding('utf8');
        process.stderr.setEncoding('utf8');

        process.on('exit', function(code, signal) {

            var result = process.stdout.read();
            var errors = process.stderr.read();

            GetMetadata(meta_filename, function(metadata) {
                StoreFileInDatabase(raw_data_uuid, panel_filename, function(start_time, end_time) {                    
                    var videos = [];
                    if(typeof req.body.video_url !== "undefined" && req.body.video_url !== ""){
                        videos.push(req.body.video_url);
                    }
                    
                    var create_dataset_command = "INSERT INTO dataset(id, data, name, submit_date, submit_user, start_time, end_time, processing_config, processing_stdout, processing_stderr, metadata, video, event_type, description) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                    var data = [];
                    data.push(dataset_uuid);
                    data.push(raw_data_uuid);
                    data.push(req.body.title);
                    data.push(Date.now()); //TODO(SRLM): This won't give the submit date/time relative to user!
                    data.push(req.user.id);//Fake user
                    data.push(start_time);
                    data.push(end_time);
                    data.push(req.body.config);
                    data.push(result);
                    data.push(errors);
                    data.push(metadata.toString());
                    data.push(videos);
                    data.push(req.body.event_type);
                    data.push(req.body.description);
                    
                    console.log("Getting ready to store dataset...");

                    database.execute(create_dataset_command, data, function(err) {
                        if (err) {
                            console.log("Database error: ", err);
                        } else {
                            console.log("Done storing " + dataset_uuid + " in database");
                        }
                    });
                });
            });
        });
    });

    res.render("upload_delay", {uuid: dataset_uuid});

};
