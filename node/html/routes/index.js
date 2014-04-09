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
    app.get('/dataset/:id', IsAuthenticated, require('./spa').getDataset);
    app.get('/event/:id', IsAuthenticated, require('./spa').getEvent);
        
    app.get('/user/:uuid', IsAuthenticated, require('./user').get);
    
    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);
    
    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);
    app.post('/upload/rnc/process', IsAuthenticated, require('./rncprocess').post);

    app.get('/monitor', IsAuthenticated, require('./monitoringtools').get); 
};
