
// default to development environment
if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'development';
}

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('general', {file: 'config/general.json'})
    .file('deployment', {file: 'config/' + process.env.NODE_ENV + '.json'})
    .file('common', {file: '../config/' + process.env.NODE_ENV + '.json'});

// Standard modules that we need:
var express = require('express');
var http = require('http');

// Express and Connect stuff
var app = express();
app.set('port', nconf.get('port'));

//app.use(require('serve-favicon')(nconf.get('faviconPath')));


app.use(require('compression')());
//app.use(logger.logger());

app.use('/static', express.static(nconf.get('staticPath')));
// Catch all the requests for non-existant static resources.
// If we don't go through this hoop then the 404 redirect to the fancy
// html page will mess up our passport authorization and prevent
// us from having sessions. Plus we might as well be as lightweight
// as possible on these static resources.
app.use('/static/:anything?*', function (req, res, next) {
    res.status(404).json({message: '404: Could not find that static resource.'});
});

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------
function sendIndex(req, res, next) {
    // Send the user information so that the app doesn't have to make an
    // initial JSON request.
    /*if (typeof req.session.passport.user !== 'undefined') {
     res.cookie('currentUser', JSON.stringify(req.session.passport.user));
     }*/
    console.log('[' + (new Date().toUTCString()) + '] Sending file.');
    res.sendFile(nconf.get('applicationPagePath'));
    //res.sendFile(nconf.get('applicationPagePath'));
}

// ----------------------------------------------------------------------------
// Routes
// These are the main site routes
// ----------------------------------------------------------------------------

// TODO(SRLM): I'll have to add this in...
app.get('/dataset/:id', require('./routes/spa').getDataset);
//app.get('/event/:id', require('./routes/spa').getEvent);


app.get('/domains', function (req, res, next) {
    res.json({
        apiUrl: nconf.get('apiUrl'),
        htmlUrl: nconf.get('htmlUrl')
    });
});


// For everything else, send the single page application and let it figure out what to do
// Note that this doesn't 404 an invalid response, since validity will be decided on the client.
// That's a future optimization, but pretty low priority.
app.use(sendIndex);

// ----------------------------------------------------------------------------

var server = http.createServer(app);

server.listen(nconf.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
