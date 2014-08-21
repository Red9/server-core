var logger = requireFromRoot('support/logger');
var log = logger.log; // console.log replacement
var config = require('./config');
var underscore = require('underscore')._;

/** Load the user info into the templating response. This allows us to have a
 * central place to load the logged in user information (if available).
 * @param {type} req
 * @param {type} res
 * @param {type} next
 */
function LoadGlobalTemplateParameters(req, res, next) {
    if (req.isAuthenticated()) {
        res.locals['user'] = req.user;
    }

    res.locals['actionUrl'] = config.realms.action;
    res.locals['apiUrl'] = config.realms.api;
    if (config.release === false) {
        res.locals['development'] = true;
    }

    next();
}

exports.init = function() {
    process.on('message', function(message) {
        if (typeof message.port !== 'undefined') {

            // Standard modules that we need:
            var express = require('express');
            var http = require('http');
            var path = require('path');
            var hbs = require('hbs');

            // Express and Connect stuff
            var app = express();
            app.set('port', message.port);
            app.set('views', __dirname + '/html/views');
            app.set('view engine', 'html');
            app.engine('html', hbs.__express); // Handlebars templating

            var staticPath = config.clientDirectory;

            if (config.release === true) {
                staticPath = path.join(staticPath, 'release');
                app.use(require('serve-favicon')(path.join(staticPath, '/static/images/favicon.ico')));
            } else {
                app.use(require('serve-favicon')(path.join(staticPath, '/static/images/favicon.localdev.ico')));
            }

            app.use(require('compression')());
            app.use(require('method-override')());

            app.use('/static', express.static(path.join(staticPath, 'static')));
            // Catch all the requests for non-existant static resources.
            // If we don't go through this hoop then the 404 redirect to the fancy
            // html page will mess up our passport authorization and prevent
            // us from having sessions. Plus we might as well be as lightweight
            // as possible on these static resources.
            app.use('/static/:anything?*', function(req, res, next) {
                res.status(404).json({message: '404: Could not find that static resource.'});
            });


            // We don't want to log static files, so logger goes after.
            app.use(logger.logger());
            app.use(require('body-parser').urlencoded(
                    {
                        extended: true
                    }
            ));

            var extra = requireFromRoot('support/extra');
            var passport = extra.initializeSession(app, true);

            // TODO(SRLM): Figure out a better way to share code between client and server
            var hbsHelpers = require(path.join(config.clientDirectory, 'static/js/utilities/customHandlebarsHelpers'));
            hbsHelpers.RegisterHelpers(hbs, require('moment'));

            // Store some local variables for all rendered templates.
            underscore.extend(app.locals, config.pageTemplateDefaults);

            app.use(LoadGlobalTemplateParameters);

            // These are the main site routes
            requireFromRoot('html/routes')(app, passport);

            app.use(function(req, res, next) {
                res.redirect(404, '/page/404');
            });

            var server = http.createServer(app);

            server.listen(app.get('port'), function() {
                log.info('Express server listening on port ' + app.get('port'));
            });
        }
    });
};