var config = requireFromRoot('config');

exports.initializeSession = function(app) {
    app.use(require('cookie-parser')());
    var session = require('express-session');
    var mongoStore = require('connect-mongo')(session);

    app.use(session(
            {
                secret: config.sessionSecret,
                maxAge: config.sessionMaxAge,
                cookie: {
                    domain: ".redninesensor.com"
                },
                store: new mongoStore({
                    db: 'sessionStore'
                })
            }
    ));

    // We don't actually log users in here: that's done via the HTML
    // server. We just share the session.
    var passport = require('passport');
    passport.serializeUser(function(user, done) {
        done(null, user);
    });
    passport.deserializeUser(function(user, done) {
        done(null, user);
    });
    app.use(passport.initialize());
    app.use(passport.session());
};

exports.cors = function(app) {
    // Enable CORS: http://enable-cors.org/server_expressjs.html
    app.all('*', function(req, res, next) {
        var acceptableOrigin = config.realms.html;
        if (req.get('origin') === 'null') {
            // Null origin comes from developing with a 'file://' url, aka, self
            // hosted HTML page.
            acceptableOrigin = 'null';
        }

        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', acceptableOrigin);
        res.header('Access-Control-Allow-Headers', 'X-Requested-With');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        next();
    });
};