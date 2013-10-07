
/**
 * Module dependencies.
 */
require('nodetime').profile({
    accountKey: 'b0bde370aeb47c1330dbded1c830a5d93be1e5e2',
    appName: 'Node.js Application'
});



var log = require('./support/logger').log;
var request_logger = require('./support/logger').logger;

log.info("Node.js server started.");


var stdio = require('stdio');
var ops = stdio.getopt({
    'realm': {key: 'r', args: 1, description: "The realm for google authentication. Include the full domain."}
});

var port = process.env.PORT || 8080;

var realm = "http://localhost:" + port;
if (typeof ops.realm !== "undefined") {
    realm = ops.realm;

}

log.info("Using realm: " + realm);


var express = require('express');
var routes = require('./routes');

var http = require('http');
var path = require('path');

var hbs = require('hbs');

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var passport = require('passport');
var GoogleStrategy = require('passport-google').Strategy;

var authenticate = require('./support/authenticate');


passport.use(new GoogleStrategy({
    returnURL: realm + '/login/google/return',
    realm: realm
},
function(identifier, profile, done) {
    authenticate.CheckUserForLogin(identifier, profile, function(user_info) {
        if (typeof user_info !== "undefined") {
            log.info("Login attempt (successful)", {profile: profile, id: identifier.toString(), user_info: user_info});
            done(null, user_info);
        } else {
            log.info("Login attempt (failed)", {profile: profile, id: identifier.toString(), user_info: user_info});

            var email_domain = "";
            try {
                email_domain = profile.emails[0].value.replace(/.*@/, "");
            } catch (ex) {
                //Do nothing...
                log.info("Could not parse login email: %s", ex.toString());
            }


            log.info("attempt domain: " + email_domain);
            if (email_domain === "redninesensor.com") {
                authenticate.AddUser(identifier, profile, function(new_user_info) {
                    done(null, new_user_info);
                });
            } else {


                done(null, false);
            }
        }
    });



}
));



passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(id, done) {
    done(null, id);
});


var app = express();
// all environments
app.set('port', port);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', hbs.__express);
app.use(express.favicon());


app.use(request_logger());


app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.cookieParser());
app.use(express.bodyParser());

app.use(express.session({secret: 'powells at pdx', maxAge: 360 * 5}));
app.use(passport.initialize());
app.use(passport.session());




// http://stackoverflow.com/questions/16452123/how-to-create-global-variables-accessible-in-all-views-using-express-node-js
app.locals({
    site: {
        title: 'rnb2rnt.jar',
        description: 'A processing and viewing interface for RedNine binary data'
    },
    author: {
        display_name: 'srlm',
        email: 'srlm@srlmproductions.com'
    }
});

function LoadUserInfo(req, res, next) {
    if (req.isAuthenticated()) {
        //console.log("req: ", req);
        res.locals['user'] = {display_name: req.user.display_name,
            id: req.user.id};
    }
    next();
}

app.use(LoadUserInfo);


app.use(app.router);


// development only
if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}

require('./routes')(app, passport);


var server = http.createServer(app);

server.listen(app.get('port'), function() {
    log.info('Express server listening on port ' + app.get('port'));
});


io = require('socket.io').listen(server);


var socket_routes = [];
socket_routes.push(require('./routes/rnbprocess').NewSocket);


io.sockets.on('connection', function(socket) {
    socket.on('page_uuid', function(data) {
        var page_uuid = data.page_uuid;
        log.info("Got new page uuid (" + page_uuid + "). Searching for handler.");
        var i = 0;
        while(i < socket_routes.length && socket_routes[i](socket, page_uuid)){
            i++;
        }
    });
});


