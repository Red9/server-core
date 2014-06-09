var config = requireFromRoot('config');

function IsAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        console.log('Not authenticated!');
        //next();
        res.redirect('/about');
    }
}


module.exports = function(app, passport) {

    app.get('/about', require('./about').get);

    app.get('/login', require('./login').get);
    app.get('/logout', require('./logout').get);


    app.get('/login/authenticate', function(req, res, next) {
        if (config.offline === true) {
            console.log('Doing offline login...');
            req.body.username = 'offline.user';
            req.body.password = 'password';
            passport.authenticate('local')(req, res, function(req, res){
                console.log('Success(?)');
                res.redirect('/');
            });
        } else {
            passport.authenticate('google')(req, res, next);
        }
    });
    app.get('/login/google/return', passport.authenticate('google',
            {
                successRedirect: '/',
                failureRedirect: '/login?failed_login=true'
            }));

    // --------------------------------------------
    // Authentication Barrier
    // --------------------------------------------

    app.get('/', IsAuthenticated, require('./datasetindex').get);

    app.get('/dataset', IsAuthenticated, require('./datasetindex').get);
    app.get('/dataset/:id', IsAuthenticated, require('./spa').getDataset);
    app.get('/event/:id', IsAuthenticated, require('./spa').getEvent);

    app.get('/user/:uuid', IsAuthenticated, require('./user').get);

    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);

    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);

    app.get('/monitor', IsAuthenticated, require('./monitoringtools').get);
};
