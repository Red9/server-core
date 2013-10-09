/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


var fs = require('fs');
var lazy = require('lazy');

var log = require('./../support/logger').log;

var exec = require('child_process').exec;


var database = require('./../support/database').database;

var column_base = 0;
var column_names = {};
column_names["accl_x"] = column_base + 0;
column_names["accl_y"] = column_base + 1;
column_names["accl_z"] = column_base + 2;
column_names["gyro_x"] = column_base + 3;
column_names["gyro_y"] = column_base + 4;
column_names["gyro_z"] = column_base + 5;
column_names["magn_x"] = column_base + 6;
column_names["magn_y"] = column_base + 7;
column_names["magn_z"] = column_base + 8;
column_names["baro"] = column_base + 9;
column_names["temp"] = column_base + 10;



var user_requests = {};

function SerializeUserRequests(user_id){
    if(user_requests[user_id].length === 0){
        //all done
        delete user_requests[user_id];
    }else{
        var next_request = user_requests[user_id].shift();
        ProcessRequest(next_request.req, next_request.res, user_id, SerializeUserRequests);
    }
}


exports.get = function(req, res) {
    //req.user.id;
    var user_id = req.user.id;
    if(typeof user_requests[user_id] === "undefined"){
        user_requests[user_id] = [];
        user_requests[user_id].push({req:req,res:res});
        SerializeUserRequests(user_id);
    }else{
        user_requests[user_id].push({req:req,res:res});
    }
};



function ProcessRequest(req, res, user_id, callback){
    
    var startTime = "undefined";
    var endTime = "undefined";
//    var numIntervals = Number.MAX_VALUE;

    var output_column_indexes = [];

    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");
    }

    var command = "java -jar downsampler.jar";
    command += " --uuid " + req.params.uuid;

    if (typeof req.param('startTime') !== "undefined") {
        var start_time = new Date(Math.floor(parseFloat(req.param('startTime'))));
        command += " --start_time " + start_time.getTime();
    }

    if (typeof req.param('endTime') !== "undefined") {
        var end_time = new Date(Math.ceil(parseFloat(req.param('endTime'))));
        command += " --end_time " + end_time.getTime();
    }


    if (typeof req.param('buckets') !== "undefined") {
        var buckets = parseInt(req.param('buckets'));
        command += " --buckets " + buckets;
    }

    if (typeof req.param('columns') !== "undefined") {
        var requested_columns = req.param('columns').split(",");

        for (var i = 0; i < requested_columns.length; i++) {
            var number = parseInt(requested_columns[i]);
            if (isNaN(number) === false) {
                output_column_indexes.push(number);
                //column_labels.push("Col_" + number.toString());
            } else {
                if (requested_columns[i] in column_names) {
                    output_column_indexes.push(column_names[requested_columns[i]]);
                    //column_labels.push(requested_columns[i]);
                } else {
                    console.log("No column name that matches '" + requested_columns[i] + "'");
                }


            }
        }
        if (output_column_indexes.length !== 0) {
            command += " --columns " + output_column_indexes[0];
            for (var i = 1; i < output_column_indexes.length; i++) {
                command += "," + output_column_indexes[i];
            }
        }


    }
    
    log.info("Downsample command: '" + command + "'");
    
    exec(command, function(err, stdout, stderr){
        if(typeof err !== "undefined" && err !== null){
            log.warn("Downsampling error: ", err);
            log.warn("    ---: ", stderr);
            res.end();
        }else{
            res.write(stdout);
            res.end();
        }
        callback(user_id);
    });

}
