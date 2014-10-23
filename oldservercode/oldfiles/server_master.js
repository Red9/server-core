//var agent = require('webkit-devtools-agent');

var underscore = require('underscore')._;
var cluster = require('cluster');

var config = require('./config');
config.ProcessCommandLine();
var logger = requireFromRoot('support/logger');

if (cluster.isMaster) {
    // Logging setup

    logger.init(config.serverType, 'master');
    var log = logger.log; // console.log replacement

    var workerPorts = {};
    log.info('Master ' + config.serverType + ' process started. Starting worker processes.');
    log.info("Release Server: " + config.release);



    if (config.release === true && config.serverType === 'html') {
        // Only use nodetime on the deployed server
        require('nodetime').profile(config.nodetimeProfile);
    }

    underscore.each(config.ports[config.serverType], function(port) {
        var worker = cluster.fork();
        worker.send({port: port});
        workerPorts[worker.id] = port;
    });

    cluster.on('exit', function(worker) {
        log.error('Worker ' + config.serverType + ' ' + worker.id + ' died!');

        var workerPort = workerPorts[worker.id];
        delete workerPorts[worker.id];

        var newWorker = cluster.fork();
        newWorker.send({port: workerPort});
        workerPorts[newWorker.id] = workerPort;
    });
} else {//Worker process
    logger.init(config.serverType, '' + cluster.worker.id);
    requireFromRoot('server_worker_' + config.serverType).init();
}