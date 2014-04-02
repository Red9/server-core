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
    }
];

exports.init = function() {
    process.on('message', function(message) {
        if (typeof message.port !== 'undefined') {

            //log.info("HTML Node.js worker started.");
            //log.info("Using realm: " + config.htmlRealm);
            //log.info("Are we running release server? " + config.release);


// Standard modules that we need:
            var express = require('express');
            var routes = requireFromRoot('html/routes');
            var http = require('http');
            var path = require('path');
            var hbs = require('hbs');

            // TODO(SRLM): Figure out a better way to share code between client and server
            var hbsHelpers = requireFromRoot('html/public/development/js/utilities/customHandlebarsHelpers');
            hbsHelpers.RegisterHelpers(hbs);

// Authentication details
            var passport = require('passport');
            var GoogleStrategy = require('passport-google').Strategy;
            var authenticate = requireFromRoot('support/authenticate');

            passport.use(new GoogleStrategy({
                returnURL: config.realms.html + '/login/google/return',
                realm: config.realms.html
            }, authenticate.ProcessLoginRequest));

            passport.serializeUser(function(user, done) {
                done(null, user);
            });

            passport.deserializeUser(function(id, done) {
                done(null, id);
            });

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

                res.locals['apiUrl'] = config.realms.api;
                if (config.release === false) {
                    res.locals['development'] = true;
                }

                next();
            }




// Express and Connect stuff
            var app = express();
            app.set('port', message.port);
            app.set('views', __dirname + '/html/views');
            app.set('view engine', 'html');
            app.engine('html', hbs.__express); // Handlebars templating

            if (config.release === true) {
                app.use(express.favicon(path.join(__dirname, 'html/public/common/images/favicon.ico')));
            } else {
                app.use(express.favicon(path.join(__dirname, 'html/public/common/images/favicon.localdev.ico')));
            }

            app.use(logger.logger()); // Middleware to log all requests.
            app.use(express.compress());
            app.use(express.methodOverride());


            // Set up static directories.
            underscore.each(staticDirectories, function(resource) {
                var path;
                if (config.release === true) {
                    path = resource.sourcePath.release;
                } else {
                    path = resource.sourcePath.development;
                }

                app.use(resource.rootUrl, express.static(__dirname + path));
            });


            app.use(express.cookieParser());
            app.use(express.bodyParser());

            app.use(express.session({secret: config.sessionSecret, maxAge: 360 * 5}));
            app.use(passport.initialize());
            app.use(passport.session());

// source: http://stackoverflow.com/questions/16452123/how-to-create-global-variables-accessible-in-all-views-using-express-node-js
            app.locals(config.pageTemplateDefaults);

            app.use(LoadGlobalTemplateParameters);
            app.use(app.router);

            requireFromRoot('html/routes')(app, passport); // These are the main site routes

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