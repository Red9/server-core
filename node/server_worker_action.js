var logger = requireFromRoot('support/logger');
var log = logger.log;
var config = require('./config');

exports.init = function() {

    // Standard modules that we need:
    var express = require('express');
    var http = require('http');


    process.on('message', function(message) {
        if (typeof message.port !== 'undefined') {

            // Express and Connect stuff
            var app = express();
            app.set('port', message.port);

            //app.set('json spaces', 0); // Output space free JSON

            app.use(logger.logger()); // Middleware to log all requests. Uses logger
            app.use(require('compression')());
            app.use(require('body-parser').json());
            app.use(require('body-parser').urlencoded());

            var extra = requireFromRoot('support/extra');
            extra.initializeSession(app);
            extra.cors(app);

            app.options('*', function(req, res, next) {
                // intercept OPTIONS method
                res.send(200);
            });

            app.use(require('errorhandler')());

            requireFromRoot('action/routes')(app); // These are the main site routes

            app.use(function(req, res, next) {
                res.status(404).json({title: "Sorry, that action route does not exist"});
            });

            var server = http.createServer(app);

            server.listen(app.get('port'), function() {
                log.info('Express ACTION server listening on port ' + app.get('port'));
            });



            requireFromRoot('action/socketroutes/socketmanager').start(server);

        }
    });
};