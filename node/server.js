
var config = require('./config');

// Constants
var port = process.env.PORT || config.defaultPort;



// Process command line arguments
var stdio = require('stdio');
var ops = stdio.getopt({
    'realm': {key: 'r', args: 1, description: "The realm for google authentication. Include the full domain (with http and all)."}
});
var realm = config.defaultRealm + ":" + port; // Default realm
if (typeof ops.realm !== "undefined") {
    realm = ops.realm;

    // Only use nodetime on the deployed server
    require('nodetime').profile(config.nodetimeProfile);
}



// Logging setup
var log = require('./support/logger').log; // console.log replacement
var request_logger = require('./support/logger').logger; // Connect middleware
log.info("Node.js server started.");
log.info("Using realm: " + realm);




// Standard modules that we need:
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var hbs = require('hbs');



// Authentication details
var passport = require('passport');
var GoogleStrategy = require('passport-google').Strategy;
var authenticate = require('./support/authenticate');

passport.use(new GoogleStrategy({
    returnURL: realm + '/login/google/return',
    realm: realm
}, authenticate.ProcessLoginRequest ));

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
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', hbs.__express); // Handlebars templating
app.use(express.favicon());

app.use(request_logger()); // Middleware to log all requests.

app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.cookieParser());
app.use(express.bodyParser());

app.use(express.session({secret: config.sessionSecret, maxAge: 360 * 5}));
app.use(passport.initialize());
app.use(passport.session());

// source: http://stackoverflow.com/questions/16452123/how-to-create-global-variables-accessible-in-all-views-using-express-node-js
app.locals(config.pageTemplateDefaults);

app.use(LoadUserInfo);
app.use(app.router);

// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}

require('./routes')(app, passport); // These are the main site routes

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
socket_routes.push(require('./routes/rnbprocess').NewSocket);
socket_routes.push(require('./routes/rncprocess').NewSocket);

io.sockets.on('connection', function(socket) {
    socket.on('page_uuid', function(data) {
        var page_uuid = data.page_uuid;
        log.info("Got new page uuid (" + page_uuid + "). Searching for handler.");
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


