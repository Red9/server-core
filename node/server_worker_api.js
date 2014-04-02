var logger = requireFromRoot('support/logger');
var log = logger.log;
var config = require('./config');

exports.init = function() {

    // Standard modules that we need:
    var express = require('express');
    var routes = requireFromRoot('api/routes');
    var http = require('http');


    process.on('message', function(message) {
        if (typeof message.port !== 'undefined') {

            // Express and Connect stuff
            var app = express();
            app.set('port', message.port);

            //app.set('json spaces', 0); // Output space free JSON

            app.use(logger.logger()); // Middleware to log all requests. Uses logger
            app.use(express.compress());
            app.use(express.cookieParser());
            app.use(express.json());
            app.use(express.urlencoded());

            app.use(express.session({secret: config.sessionSecret, maxAge: 360 * 5}));

            app.use(app.router);

            // Enable CORS: http://enable-cors.org/server_expressjs.html
            app.all('*', function(req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'X-Requested-With');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
                next();
            });

            app.use(express.errorHandler());

            requireFromRoot('api/routes')(app); // These are the main site routes

            app.use(function(req, res, next) {
                res.status(404).json({title: "Sorry, that api route does not exist"});
            });

            var server = http.createServer(app);

            server.listen(app.get('port'), function() {
                log.info('Express API server listening on port ' + app.get('port'));
            });


            requireFromRoot('support/resources/usr').loadUsrs();
        }
    });
};