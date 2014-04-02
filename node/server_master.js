
var underscore = require('underscore')._;
var cluster = require('cluster');

var config = require('./config');
config.ProcessCommandLine();
var logger = requireFromRoot('support/logger');

if (cluster.isMaster) {
    // Logging setup
    
    logger.init(config.serverType, 'master');
    var log = logger.log; // console.log replacement

    workerPorts = {};
    log.info('Master ' + config.serverType + ' process started. Starting worker processes.');
    log.info("Release Server: " + config.release);
    
    
    
    if (config.release === true && config.serverType === 'html') {
        // Only use nodetime on the deployed server
        require('nodetime').profile(config.nodetimeProfile);
        
        // Only optimize static JS resources on the deployed server.
        var requirejs = require('requirejs');
        log.info('Beginning Static File Optimization.');
        requirejs.optimize({
            appDir: 'html/public/development/js',
            dir: 'html/public/release/js'
        },
        function(err) {
            if (err) {
                log.error('Static file optimization error: ' + err);
                process.exit(1);
            } else {
                log.info('Using optimized static files.');
            }
        });
    }
    
    
    

    underscore.each(config.ports[config.serverType], function(port) {
        var worker = cluster.fork();
        console.log('Port: ' + port);
        worker.send({port: port});
        workerPorts[worker.id] = port;
    });

    cluster.on('exit', function(worker) {
        log.error('Worker ' + config.serverType + ' '  + worker.id + ' died!');

        var workerPort = workerPorts[worker.id];
        delete workerPorts[worker.id];

        var newWorker = cluster.fork();
        newWorker.send({port: workerPort});

    });
} else {//Worker process
    logger.init(config.serverType, '' + cluster.worker.id);
    requireFromRoot('server_worker_' + config.serverType).init();
}