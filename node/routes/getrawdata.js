var log = require('./../support/logger').log;
var spawn = require('child_process').spawn;
var database = require('./../support/database').database;

var config = require('./../config');
/*
var user_requests = {};

function SerializeUserRequests(user_id) {
    if (user_requests[user_id].length === 0) {
        //all done
        delete user_requests[user_id];
    } else {
        var next_request = user_requests[user_id].shift();
        ProcessRequest(next_request.req, next_request.res, user_id, SerializeUserRequests);
    }
}


exports.get = function(req, res) {
    var user_id = req.user.id;
    if (typeof user_requests[user_id] === "undefined") {
        user_requests[user_id] = [];
        user_requests[user_id].push({req: req, res: res});
        SerializeUserRequests(user_id);
    } else {
        user_requests[user_id].push({req: req, res: res});
    }
};
*/
function LogDownsampleCommand(parameters) {
    var downsample_command = "Downsample command: 'java";
    for (var i = 0; i < parameters.length; i++) {
        downsample_command += " " + parameters[i];
    }
    downsample_command += "'";
    log.info(downsample_command);
}


exports.get = function(req, res){
    ProcessRequest(req, res);
};


function ProcessRequest(req, res, user_id, callback) {

    var parameters = [];
    parameters.push('-jar');
    parameters.push(config.downsamplerPath);
    parameters.push('--uuid');
    parameters.push(req.params.uuid);

    if (typeof req.param('minmax') !== "undefined") {
        if (req.param('minmax') === "true") {
            parameters.push('--minmax');
        }
    } else {
        parameters.push('--minmax');
    }

    if (typeof req.params.uuid === "undefined") {
        var error_message = "UUID should not be undefined!";
        log.error(error_message);
        res.send(error_message);
    }

    if (typeof req.param('startTime') !== "undefined") {
        var start_time = new Date(Math.floor(parseFloat(req.param('startTime'))));
        parameters.push('--start_time');
        parameters.push(start_time.getTime());
    }

    if (typeof req.param('endTime') !== "undefined") {
        var end_time = new Date(Math.ceil(parseFloat(req.param('endTime'))));
        parameters.push('--end_time');
        parameters.push(end_time.getTime());
    }

    if (typeof req.param('buckets') !== "undefined") {
        var buckets = parseInt(req.param('buckets'));
        parameters.push('--buckets');
        parameters.push(buckets);
    }

    if (typeof req.param('columns') !== "undefined") {
        parameters.push('--columns');
        parameters.push(req.param('columns'));
    }

    LogDownsampleCommand(parameters);

    var downsampler = spawn("java", parameters);
    var errors = "";
    downsampler.stdout.on('data', function(data) {
        res.write(data);
    });
    downsampler.stderr.on('data', function(data) {
        errors += data;
    });

    downsampler.on('close', function(code) {
        res.end();
        if (errors !== "") {
            log.warn("Downsampling error for parameters '" + parameters + "': '" + errors + "'");
        }

        //callback(user_id);
    });
}
