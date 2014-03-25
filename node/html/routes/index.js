function IsAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        //next();
        res.redirect('/about');
    }
}


module.exports = function(app, passport) {
    
    app.get('/about', require('./about').get);
    
    app.get('/login', require('./login').get);
    app.get('/logout', require('./logout').get);

    app.get('/login/google', passport.authenticate('google'));
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
    //app.get('/dataset/:uuid', IsAuthenticated, require('./datasetdisplay').get);
    app.get('/dataset/:id', IsAuthenticated, require('./spa').get);
    app.get('/event/:id', IsAuthenticated, require('./spa').get);
    
    
    app.get('/panel/:uuid/download', IsAuthenticated, require('./customdownload').get);
        
    app.get('/user/:uuid', IsAuthenticated, require('./user').get);
    
    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);
    
    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);
    app.post('/upload/rnc/process', IsAuthenticated, require('./rncprocess').post);
    

    app.get( '/snippet/:type', IsAuthenticated, require('./getsnippet').get);
    
    app.get('/monitor', IsAuthenticated, require('./monitoringtools').get);

    //for Jorge's testing purposes
    app.post('/noop/', function (req, res) {
      res.send({prop1: 'value 1'});
    });
    app.get('/noop/', function (req, res) {
      res.send({prop1: 'value 1'});
    });

    app.get('/lens/:type', IsAuthenticated, require('./getlens').get);
    
    app.get('/spa', require('./spa').get);
    
};
