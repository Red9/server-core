function IsAuthenticated(req, res, next) {
    /*if (req.isAuthenticated()) {
        next();
    } else {
        next();
        //res.redirect('/about');
    }*/
    next();
}


module.exports = function(app, passport) {
    // --------------------------------------------
    // Authentication Barrier
    // --------------------------------------------
    app.get('/', IsAuthenticated, require('./navigation').index);

    app.get('/dataset/', IsAuthenticated, require('./dataset').search);
    app.get('/dataset/:id', IsAuthenticated, require('./dataset').get);
    app.post('/dataset/:id/update', IsAuthenticated, require('./dataset').update);
    app.post('/dataset/:id/delete', IsAuthenticated, require('./dataset').delete);
    
    app.get('/event/', IsAuthenticated, require('./event').search);
    app.get('/event/:id', IsAuthenticated, require('./event').get);
    app.post('/event/', IsAuthenticated, require('./event').create);
    app.post('/event/:id/update', IsAuthenticated, require('./event').update);
    app.post('/event/:id/delete', IsAuthenticated, require('./event').delete);
    
    app.get('/user/', IsAuthenticated, require('./user').search);
    app.get('/user/:id', IsAuthenticated, require('./user').get);
    app.post('/user/:id/update', IsAuthenticated, require('./user').update);
    
    app.get('/history/', IsAuthenticated, require('./history').search);
    app.get('/history/:id', IsAuthenticated, require('./history').get);
    app.post('/history/', IsAuthenticated, require('./history').create);
    app.post('/history/:id/update', IsAuthenticated, require('./history').update);
    app.post('/history/:id/delete', IsAuthenticated, require('./history').delete);
    
    app.get('/comment/', IsAuthenticated, require('./comment').search);
    app.get('/comment/:id', IsAuthenticated, require('./comment').get);
    app.post('/comment/', IsAuthenticated, require('./comment').create);
    app.post('/comment/:id/update', IsAuthenticated, require('./comment').update);
    app.post('/comment/:id/delete', IsAuthenticated, require('./comment').delete);
    
    app.get('/units/', IsAuthenticated, require('./units').search);
    app.get('/units/:system', IsAuthenticated, require('./units').get);
    
    app.get('/dataset/:id/panel', IsAuthenticated, require('./panel').get);
    app.post('/dataset/:id/panel/update', IsAuthenticated, require('./panel').update);
    
    //app.post('/upload/rnb/process', IsAuthenticated, require('./rnbprocess').post);
    //app.post('/upload/rnc/process', IsAuthenticated, require('./rncprocess').post);
};
