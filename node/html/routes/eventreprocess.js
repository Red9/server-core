var spawn = require('child_process').spawn;

var database = require('./../../support/database');
var log = require('./../../support/logger').log;
var config = require('./../../config');

var externals = require('./../../support/externals');

var page_uuid_list = {};
var async = require('async');

/*
// DUPLICATE! HACK! FIX ME!
var BeginStatisticsCalculation = function(page_uuid, event_uuid, callback) {
    var parameters = [];
    parameters.push('-jar');
    parameters.push('bin/statistician.jar');
    parameters.push('--event');
    parameters.push(event_uuid);
    parameters.push('--cassandrahost');
    parameters.push('127.0.0.1');
    parameters.push('--childrenpath');
    parameters.push(config.statistician_children);
    var statistician = spawn('java', parameters);
    

    var errors = "";
    var data_to_send = "";
    statistician.stderr.on('data', function(data) {
        errors += data;
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

    statistician.on('exit', function(code, signal) {
        if(code !== 0){
            log.error("Statistician code !== 0. Error: '" + errors + "'", "i");
        }
        callback();
    });
};*/





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
        page_uuid_list[page_uuid].emit('done_processing', {});
    } else {
    }

    delete page_uuid_list[page_uuid];
}

var BeginEventProcessing = function(page_uuid){
    database.GetAllRows("event", function(data){
        
        var counter = 1; // It's a human thing, so start at 1.
        
        log.warn("Beginning event statistics recalculation. ++++++++++");
        async.eachSeries(data, function(row, asyncCallback){
            SendOnSocket(page_uuid, "-----------------------------------------------------");
            SendOnSocket(page_uuid, "Starting calculations for: " + row["id"] + "( event " + counter + " of " + data.length + ")");
            counter = counter + 1;
            
            externals.BeginStatisticsCalculation(row["id"], function(code, stdout, stderr){
               SendOnSocket(page_uuid, stderr); 
               asyncCallback();
            });
            
            
        }, function(err){
           if(err){
               log.error("Error reprocessing events: " + err);
           } 
           log.info("Done reprocessing events ----------");
           SendOnSocketDone(page_uuid);
        });
    });
    
   
    
   
};

exports.NewSocket = function(new_socket, socket_page_uuid) {
    if (typeof page_uuid_list[socket_page_uuid] !== "undefined") {
        page_uuid_list[socket_page_uuid] = new_socket;
        SendOnSocket(socket_page_uuid, "found handler!");
        new_socket.on('begin_event_reprocessing', function(data){
            BeginEventProcessing(socket_page_uuid);
        });
        return true;
    }else{
        return false;
    }
};



exports.get = function(req, res) {
    var page_uuid = database.GenerateUUID();
    page_uuid_list[page_uuid] = null;
    
    res.render("processstatistics", {page_title: "Reprocess Statistics", page_uuid: page_uuid});

};
