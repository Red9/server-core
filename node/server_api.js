

var cluster = require('cluster');

var config = require('./config');


if (cluster.isMaster) {
    // Logging setup
    var logger = require('./support/logger');
    logger.init('api', 'master');
    var log = logger.log; // console.log replacement

    log.info("Master API process started. Starting worker API process.");
    cluster.fork();
    cluster.on('exit', function(worker) {
        log.error("Worker API " + worker.id + " died!");
        cluster.fork();
    });
} else {//Worker process
    // Logging setup
    var logger = require('./support/logger');
    logger.init('api', '' + cluster.worker.id);
    var log = logger.log; // console.log replacement

    log.info("API Node.js worker started.");
    log.info("Release Server: " + config.releaseserver);


// Standard modules that we need:
    var express = require('express');
    var routes = require('./api/routes');
    var http = require('http');

// Express and Connect stuff
    var app = express();
    app.set('port', config.apiPort);

    //app.set('json spaces', 0); // Output space free JSON

    app.use(logger.logger()); // Middleware to log all requests. Uses logger
    app.use(express.compress());

    app.use(express.cookieParser());
    app.use(express.bodyParser());

    app.use(express.session({secret: config.sessionSecret, maxAge: 360 * 5}));

    app.use(app.router);

    // Enable CORS: http://enable-cors.org/server_expressjs.html
    app.all('*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        next();
    });

    // development only
    if ('development' === app.get('env')) {
        app.use(express.errorHandler());
    }

    require('./api/routes')(app); // These are the main site routes

    app.use(function(req, res, next) {
        res.status(404).json({title: "Sorry, api doesn't exist"});
    });

    var server = http.createServer(app);

    server.listen(app.get('port'), function() {
        log.info('Express API server listening on port ' + app.get('port'));
    });
    
    
    require('./support/resources/resource/usr_resource').loadUsrs();
}