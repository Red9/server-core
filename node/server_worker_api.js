var logger = requireFromRoot('support/logger');
var log = logger.log;
var config = require('./config');

exports.init = function() {
    // Standard modules that we need:
    var express = require('express');
    var http = require('http');

    process.on('message', function(message) {
        if (typeof message.port !== 'undefined') {
            var app = express();
            app.set('port', message.port);

            app.use(logger.logger()); // Middleware to log all requests. Uses logger
            app.use(require('compression')());

            app.use(require('body-parser').json());
            app.use(require('body-parser').urlencoded());

            var extra = requireFromRoot('support/extra');
            extra.initializeSession(app);
            extra.cors(app);

            app.use(require('errorhandler')());

            requireFromRoot('api/routes')(app); // These are the main site routes

            app.use(function(req, res, next) {
                res.status(404).json({title: "Sorry, that api route does not exist"});
            });

            var server = http.createServer(app);

            server.listen(app.get('port'), function() {
                log.info('Express API server listening on port ' + app.get('port'));
            });
        }
    });
};