var _ = require('underscore')._;

var config = requireFromRoot('config');

function IsAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/about');
    }
}


module.exports = function(app, passport) {

    //app.get('/about', require('./about').get);

    //app.get('/login', require('./login').get);
    //app.get('/logout', require('./logout').get);

//    app.get('/login/authenticate',
//            function(req, res, next) {
//                req.body.username = 'offline.user';
//                req.body.password = 'password';
//                next();
//            },
//            passport.authenticate('local'),
//            function(req, res) {
//                console.log('Success(?)');
//                res.redirect('/');
//            });


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
                failureRedirect: '/login?failed_login=true'
            }));

    // --------------------------------------------
    // Authentication Barrier
    // --------------------------------------------



    var angularPageList = [
        '/',
        '/dataset/',
        '/event/',
        '/about',
        '/login',
        '/user/:id',
        '/404',
        '/monitor',
        '/logout'
    ];

    _.each(angularPageList, function(path) {
        app.get(path, function(req, res, next) {
            res.sendFile('/html/views/index.html', {root: './'});
        });
    });

    app.get('/404', function(req, res, next) {
        res.status(404).sendFile('/html/views/index.html', {root: './'});
    });

    app.get('/dataset/:id', IsAuthenticated, require('./spa').getDataset);
    app.get('/event/:id', IsAuthenticated, require('./spa').getEvent);

    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);

    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);
};
