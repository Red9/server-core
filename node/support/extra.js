var underscore = require('underscore');

var config = requireFromRoot('config');


exports.initializeSession = function(app, allowAuthentication) {
    app.use(require('cookie-parser')());
    var session = require('express-session');
    var mongoStore = require('connect-mongo')(session);

    app.use(session(
            {
                secret: config.sessionSecret,
                maxAge: config.sessionMaxAge,
                cookie: {
                    domain: config.cookieDomain
                },
                store: new mongoStore({
                    db: 'sessionStore'
                }),
                resave: true,
                saveUninitialized: true
            }
    ));

    // We don't actually log users in here: that's done via the HTML
    // server. We just share the session.
    var passport = require('passport');

    if (allowAuthentication === true) {
        var authenticate = requireFromRoot('support/authenticate');

        /*var GoogleStrategy = require('passport-google').Strategy;
        passport.use(new GoogleStrategy({
            returnURL: config.realms.html + '/login/google/return',
            realm: config.realms.html,
            stateless: true // Allow use with other red9 servers
        }, authenticate.ProcessLoginRequest));*/

        var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

        passport.use(new GoogleStrategy({
                clientID: '464191550717-t9q80jrmsjpj8sdvmjbaeidj1k4gpuhn.apps.googleusercontent.com',
                clientSecret: 'YEGwK03xmvEp6HYgJMhj1Kpn',
                callbackURL: config.realms.html + '/login/google/return',
                scope: ['profile', 'email']
            },
            function(accessToken, refreshToken, profile, done) {
                authenticate.ProcessLoginRequest(null, profile, done);
            }
        ));


        var LocalStrategy = require('passport-local').Strategy;
        passport.use(new LocalStrategy(
                {
                    stateless: true // Allow use with other red9 servers
                },
        authenticate.processOfflineRequest));
    }

    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });
    app.use(passport.initialize());
    app.use(passport.session());

    return passport;
};

exports.cors = function(app) {
    // Enable CORS: http://enable-cors.org/server_expressjs.html
    app.all('*', function(req, res, next) {
        var acceptableOrigin = config.realms.html;
        
        // If we're comming from somewhere other than our site then make sure
        // that it's in the CORS list, and go from there.
        if (underscore.indexOf(config.corsOrigins, req.get('origin')) !== -1) {
            acceptableOrigin = req.get('origin');
        }

        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', acceptableOrigin);
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
    });
};
