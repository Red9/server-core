var _ = require('underscore')._;

var config = requireFromRoot('config');
var path = require('path');




function sendIndex(req, res, next) {
    // Send the user information so that the app doesn't have to make an
    // initial JSON request.
    if (typeof req.session.passport.user !== 'undefined') {
        res.cookie('currentUser', JSON.stringify(req.session.passport.user));
    }

    res.sendFile(indexFilename);
}

function IsAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        sendIndex(req, res, next);
    }
}


module.exports = function (app, passport) {

    // TODO(SRLM): If the authentication fails send a 401...

    app.get('/login/authenticate', function (req, res, next) {
        passport.authenticate('google')(req, res, next);
    });

    app.get('/login/google/return', passport.authenticate('google',
        {
            successRedirect: '/',
            failureRedirect: '/?loginfailure=true'
        }));

    // --------------------------------------------
    // Authentication Barrier
    // --------------------------------------------
    var angularPageList = [
        '/',
        '/dataset/',
        '/event/',
        '/user/:id',
        '/page/:name',
        '/aggregate/:page'
    ];

    _.each(angularPageList, function (path) {
        app.get(path, sendIndex);
    });

    app.get('/dataset/:id', IsAuthenticated, require('./routes/spa').getDataset);
    app.get('/event/:id', IsAuthenticated, require('./routes/spa').getEvent);

    app.get('/bluetooth', IsAuthenticated, require('./routes/bluetooth').get);

    app.get('/upload/rnc', IsAuthenticated, require('./routes/rncupload').get);
};
