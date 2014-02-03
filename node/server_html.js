

var cluster = require('cluster');
var config = require('./config');




// Process command line arguments
var stdio = require('stdio');
/*var ops = stdio.getopt({
 'realm': {key: 'r', args: 1, description: "The realm for google authentication. Include the full domain (with http and all)."}
 });*/

var ops = stdio.getopt({
    release: {key: 'r', args: 0, description: 'Set for release mode.'}
});

config.release = (typeof ops.release !== 'undefined');

if (config.release === true) {
    config.realm = config.releaseRealm;
    config.apiDomain = config.releaseApiDomain;
} else {
    config.realm = config.developmentRealm;
    config.apiDomain = config.developmentApiDomain;
}



if (cluster.isMaster) {
    // Logging setup
    var logger = require('./support/logger');
    logger.init('html', 'master');
    var log = logger.log; // console.log replacement

    // Process command line arguments
    if (config.release === true) {
        // Only use nodetime and logging services on the deployed server
        require('nodetime').profile(config.nodetimeProfile);
    }

    log.info("Master process started. Starting worker process.");
    cluster.fork();
    cluster.on('exit', function(worker) { // Always restart killed workers...
        log.error("Worker " + worker.id + " died!");
        cluster.fork();
    });


} else {//Worker process
    // Logging setup
    var logger = require('./support/logger');
    logger.init('html', '' + cluster.worker.id);
    var log = logger.log; // console.log replacement


    log.info("HTML Node.js worker started.");
    log.info("Using realm: " + config.realm);
    log.info("Are we running release server? " + config.release);


// Standard modules that we need:
    var express = require('express');
    var routes = require('./html/routes');
    var http = require('http');
    var path = require('path');
    var hbs = require('hbs');

    var moment = require('moment');

    var padNumber = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    };

    var FormatDuration = function(startTime, endTime) {
        var duration = endTime - startTime;
        if (duration === 0 || isNaN(duration)) {
            return "0.000s";
        }

        Number.prototype.mod = function(n) {
            return ((this % n) + n) % n;
        };

        var hours = Math.floor(duration / (3600000));

        var minutes = Math.floor(duration / (60000)) - (hours * 60);

        var seconds = Math.floor(duration / (1000)) - (hours * 60 * 60) - (minutes * 60);

        var milliseconds = duration
                - (seconds * 1000) - (hours * 60 * 60 * 1000) - (minutes * 60 * 1000);

        var result = "";
        if (hours > 0) {
            result = "" + hours + "h " + padNumber(minutes, 2) + "m " + padNumber(seconds, 2) + "s";
        } else if (minutes > 0) {
            result = "" + minutes + "m " + padNumber(seconds, 2) + "." + padNumber(milliseconds, 3) + "s";
        } else {
            result = "" + seconds + "." + padNumber(milliseconds, 3) + "s";
        }

        return result;

    };

    var NumberToDecimal = function(number) {
        if (typeof number === "undefined") {
            return "";
        }
        if (Math.abs(number) > 9999 || Math.abs(number) < 0.01) {
            return number.toExponential(2);
        } else {
            return parseFloat(Math.round(number * 100) / 100).toFixed(2);
        }
    };

    var MillisecondsEpochToTime = function(milliseconds) {
        return moment.utc(milliseconds).format("h:mm:ss.SSS a");
    };

    var MillisecondsEpochToDate = function(milliseconds) {
        return moment.utc(milliseconds).format("YYYY-MM-DD");
    };

    var FormatUnits = function(units) {
        /*if(units === "m/s^2"){
         return new hbs.SafeString("<sup>m</sup>&frasl;<sub>s</sub><small>2</small>");
         }else if(units === "ft/s^2"){
         return new hbs.SafeString("<sup>ft</sup>&frasl;<sub>s</sub><small>2</small>");
         }*/

        return units;
    };

    var Unitize = function(value, units) {
        if (units === "date") {
            return  MillisecondsEpochToDate(value) + MillisecondsEpochToTime(value);
        } else if (units === "ms") {
            return FormatDuration(0, value);
        } else if (typeof units === "undefined") {
            return NumberToDecimal(value);
        } else {
            return NumberToDecimal(value);
        }
    };

    var PercentFormater = function(numerator, denominator) {
        if (isNaN(numerator) || isNaN(denominator)) {
            return "---";
        } else {
            return (NumberToDecimal(numerator / (numerator + denominator)) * 100) + "%";
        }
    };

    hbs.registerHelper('decimal', NumberToDecimal);
    hbs.registerHelper('epochtime', MillisecondsEpochToTime);
    hbs.registerHelper('epochdate', MillisecondsEpochToDate);
    hbs.registerHelper('unitize', Unitize);
    hbs.registerHelper('formatunits', FormatUnits);
    hbs.registerHelper('percent', PercentFormater);
    hbs.registerHelper('duration', FormatDuration);


// Authentication details
    var passport = require('passport');
    var GoogleStrategy = require('passport-google').Strategy;
    var authenticate = require('./support/authenticate');

    passport.use(new GoogleStrategy({
        returnURL: config.realm + '/login/google/return',
        realm: config.realm
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
    function LoadUserInfo(req, res, next) {
        if (req.isAuthenticated()) {
            res.locals['user'] = {display_name: req.user.display_name,
                id: req.user.id};
        }
        next();
    }




// Express and Connect stuff
    var app = express();
    app.set('port', config.htmlPort);
    app.set('views', __dirname + '/html/views');
    app.set('view engine', 'html');
    app.engine('html', hbs.__express); // Handlebars templating
    app.use(express.favicon());

    app.use(logger.logger()); // Middleware to log all requests.
    app.use(express.compress());
    app.use(express.methodOverride());

    app.use(express.static(path.join(__dirname, 'html/public')));

    app.use(express.cookieParser());
    app.use(express.bodyParser());

    app.use(express.session({secret: config.sessionSecret, maxAge: 360 * 5}));
    app.use(passport.initialize());
    app.use(passport.session());

// source: http://stackoverflow.com/questions/16452123/how-to-create-global-variables-accessible-in-all-views-using-express-node-js
    app.locals(config.pageTemplateDefaults);

    app.use(LoadUserInfo);
    app.use(app.router);

    // Enable CORS: http://enable-cors.org/server_expressjs.html
    /*app.all('*', function(req, res, next) {
     res.header("Access-Control-Allow-Origin", "*");
     res.header("Access-Control-Allow-Headers", "X-Requested-With");
     next();
     });*/


// development only
    if ('development' === app.get('env')) {
        app.use(express.errorHandler());
    }

    require('./html/routes')(app, passport); // These are the main site routes

    app.use(function(req, res, next) {
        res.status(404).render('404_error', {title: "Sorry, page not found"});
    });

    var server = http.createServer(app);

    server.listen(app.get('port'), function() {
        log.info('Express server listening on port ' + app.get('port'));
    });



// Socket.io stuff
    io = require('socket.io').listen(server);
    io.set('log level', 2); // reduce logging

    /** This socket_routes business is to be able to associate a particular socket
     * with a particular page. This way, a server route can send data via a socket
     * even after rendering a page.
     * 
     */
    var socket_routes = [];
    socket_routes.push(require('./html/routes/rnbprocess').NewSocket);
    socket_routes.push(require('./html/routes/rncprocess').NewSocket);
    socket_routes.push(require('./html/routes/eventreprocess').NewSocket);

    io.sockets.on('connection', function(socket) {
        socket.on('page_uuid', function(data) {
            var page_uuid = data.page_uuid;
            //log.info("Got new page uuid (" + page_uuid + "). Searching for handler.");
            var i = 0;
            // This is a little bit tricky, but notice that a function is being called.
            // That function will add or not the new socket, depending on the page_uuid.
            // If it does add the socket then it will return false, and the loop 
            // ends. From the time of it's addition it's up to the route to handle
            // the socket. It's out of this function's hands.
            while (i < socket_routes.length && socket_routes[i](socket, page_uuid) === false) {
                i++;
            }
        });
    });


}