var logger = requireFromRoot('support/logger');
var log = logger.log; // console.log replacement
var config = require('./config');
var underscore = require('underscore')._;

var staticDirectories = [
    {
        rootUrl: '/js',
        sourcePath: {
            development: '/html/public/development/js',
            release: '/html/public/release/js'
        }
    },
    {
        rootUrl: '/css',
        sourcePath: {
            development: '/html/public/common/css',
            release: '/html/public/common/css'
        }
    },
    {
        rootUrl: '/images',
        sourcePath: {
            development: '/html/public/common/images',
            release: '/html/public/common/images'
        }
    },
    {
        rootUrl: '/fonts',
        sourcePath: {
            development: '/html/public/common/fonts',
            release: '/html/public/common/fonts'
        }
    },
    {
        rootUrl: '/templates',
        sourcePath: {
            development: '/html/public/common/templates',
            release: '/html/public/common/templates'
        }
    },
    {
        rootUrl: '/partials',
        sourcePath: {
            development: '/html/public/common/partials',
            release: '/html/public/common/partials'
        }
    }
];

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

            if (config.release === true) {
                app.use(require('serve-favicon')(path.join(__dirname, 'html/public/common/images/favicon.ico')));
            } else {
                app.use(require('serve-favicon')(path.join(__dirname, 'html/public/common/images/favicon.localdev.ico')));
            }

            app.use(require('compression')());
            app.use(require('method-override')());

            // Set up static directories.
            underscore.each(staticDirectories, function(resource) {
                var path;
                if (config.release === true) {
                    path = resource.sourcePath.release;
                } else {
                    path = resource.sourcePath.development;
                }
                app.use(resource.rootUrl, function(req, res, next) {
                    express.static(__dirname + path)(req, res, next);
                });
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
            var hbsHelpers = requireFromRoot('html/public/development/js/utilities/customHandlebarsHelpers');
            hbsHelpers.RegisterHelpers(hbs, require('moment'));

            // Store some local variables for all rendered templates.
            underscore.extend(app.locals, config.pageTemplateDefaults);

            app.use(LoadGlobalTemplateParameters);

            // These are the main site routes
            requireFromRoot('html/routes')(app, passport);

            app.use(function(req, res, next) {
                res.status(404).render('404_error', {title: "Sorry, page not found"});
            });

            var server = http.createServer(app);

            server.listen(app.get('port'), function() {
                log.info('Express server listening on port ' + app.get('port'));
            });
        }
    });
};