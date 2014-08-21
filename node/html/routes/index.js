var _ = require('underscore')._;

var config = requireFromRoot('config');

function IsAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect(401, '/page/about');
    }
}


module.exports = function(app, passport) {

    // TODO(SRLM): If the authentication fails send a 401...

    app.get('/login/authenticate', function(req, res, next) {
        if (config.offline === true) {
            console.log('Doing offline login...');
            req.body.username = 'offline.user';
            req.body.password = 'password';
            passport.authenticate('local')(req, res, next);
        } else {
            passport.authenticate('google')(req, res, next);
        }
    }, function(req2, res2) {
        console.log('Local login Success(?)');
        res2.redirect('/');
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
        '/page/:name'
    ];

    function sendIndex(req, res, next) {
        // Send the user information so that the app doesn't have to make an
        // initial JSON request.
        if (typeof req.session.passport.user !== 'undefined') {
            res.cookie('currentUser', JSON.stringify(req.session.passport.user));
        }
        res.sendFile('/html/public/index.html', {root: './'});
    }

    _.each(angularPageList, function(path) {
        app.get(path, sendIndex);
    });

    app.get('/dataset/:id', IsAuthenticated, require('./spa').getDataset);
    app.get('/event/:id', IsAuthenticated, require('./spa').getEvent);

    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);

    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);
};
