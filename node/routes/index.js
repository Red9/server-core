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
    app.get('/dataset/:uuid', IsAuthenticated, require('./datasetdisplay').get);
    app.get('/dataset/:uuid/download', IsAuthenticated, require('./customdownload').get);
    
    app.get('/event/:uuid', IsAuthenticated, require('./eventdisplay').get);
    
    app.get('/user/:uuid', IsAuthenticated, require('./user').get);
    
    app.get('/bluetooth', IsAuthenticated, require('./bluetooth').get);
   
    
    app.get( '/upload/rnb', IsAuthenticated, require('./rnbupload').get);
    app.post('/upload/rnb/process', IsAuthenticated, require('./rnbprocess').post);
    
    app.get('/upload/rnc', IsAuthenticated, require('./rncupload').get);
    app.post('/upload/rnc/process', IsAuthenticated, require('./rncprocess').post);
    

    app.get( '/snippet/:type', IsAuthenticated, require('./getsnippet').get);
    
    app.get(   '/api/dataset/:uuid', IsAuthenticated, require('./getrawdata').get);
    app.delete('/api/dataset/:uuid', IsAuthenticated, require('./deletedataset').delete);
    
    
    app.get(   '/api/event/tree/:uuid', IsAuthenticated, require('./geteventtree').get);    
    app.get(   '/api/event/:uuid', IsAuthenticated, require('./getevent').get);
    app.post(  '/api/event/:uuid', IsAuthenticated, require('./postevent').post);
    app.delete('/api/event/:uuid', IsAuthenticated, require('./deleteevent').delete);    

    app.get('/monitor', IsAuthenticated, require('./monitoringtools').get);
    app.get('/admin/reprocessstatistics', IsAuthenticated, require('./eventreprocess').get);
};
