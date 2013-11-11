var log = require('./../support/logger').log;
var spawn = require('child_process').spawn;
var database = require('./../support/database').database;

var config = require('./../config');

function LogDownsampleCommand(parameters) {
    var downsampleCommand = "Downsample command: 'java";
    for (var i = 0; i < parameters.length; i++) {
        downsampleCommand += " " + parameters[i];
    }
    downsampleCommand += "'";
    log.info(downsampleCommand);
}


exports.get = function(req, res) {
    ProcessRequest(req, res);
};

function ConvertToJson(text) {
    var lines = text.split('\n');
    var labels = lines[0].split(',');

    var values = [];
    for (var i = 1; i < lines.length; i++) {
        if (lines[i] !== "") {
            var line = lines[i].split(',');
            var value = [];
            for (var j = 0; j < line.length; j++) {
                if (line[j].split(';').length > 1) {
                    value.push(line[j].split(';'));
                } else {
                    value.push(line[j]);
                }
            }
            values.push(value);
        }
    }


    var result = {values: values, labels: labels};
    return result;
}


function ProcessRequest(req, res, user_id, callback) {

    var resulttype = "text";

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
    
    
    // Default to nocache.
    if (typeof req.param('cache') !== "undefined") {
        if (req.param('cache') === "false") {
            parameters.push('--nocache');
        }
    }else{
        parameters.push('--nocache');
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

    if (typeof req.param('resulttype') !== "undefined") {
        resulttype = req.param('resulttype');
    }

    LogDownsampleCommand(parameters);


    var downsampler = spawn("java", parameters);
    var errors = "";
    var text = "";
    downsampler.stdout.on('data', function(data) {
        if (resulttype === "json") {
            text += data;
        } else {
            res.write(data);
        }
    });
    downsampler.stderr.on('data', function(data) {
        errors += data;
    });

    downsampler.on('close', function(code) {
        if (resulttype === "json") {
            var json = ConvertToJson(text);
            res.json(json);
        } else {
            res.end();
        }

        if (errors !== "") {
            log.warn("Downsampling error for parameters '" + parameters + "': '" + errors + "'");
        }
    });
}
