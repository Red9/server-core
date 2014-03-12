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
    app.put('/dataset/:id', IsAuthenticated, require('./dataset').update);
    app.delete('/dataset/:id', IsAuthenticated, require('./dataset').delete);

    app.get('/panel/', IsAuthenticated, require('./panel').search);
    app.get('/panel/:id', IsAuthenticated, require('./panel').get);
    app.get('/panel/:id/body', IsAuthenticated, require('./panel').getBody);
    app.post('/panel/:id', IsAuthenticated, require('./panel').create);
    app.put('/panel/:id/body', IsAuthenticated, require('./panel').updateBody);
    app.delete('/panel/:id', IsAuthenticated, require('./panel').delete);



    app.get('/event/', IsAuthenticated, require('./event').search);
    app.get('/event/:id', IsAuthenticated, require('./event').get);
    app.post('/event/', IsAuthenticated, require('./event').create);
    app.put('/event/:id', IsAuthenticated, require('./event').update);
    app.delete('/event/:id', IsAuthenticated, require('./event').delete);


    app.get('/user/', IsAuthenticated, require('./user').search);
    app.get('/user/:id', IsAuthenticated, require('./user').get);
    app.put('/user/:id', IsAuthenticated, require('./user').update);

    app.get('/history/', IsAuthenticated, require('./history').search);
    app.get('/history/:id', IsAuthenticated, require('./history').get);
    app.post('/history/', IsAuthenticated, require('./history').create);
    app.put('/history/:id', IsAuthenticated, require('./history').update);
    app.delete('/history/:id', IsAuthenticated, require('./history').delete);

    app.get('/comment/', IsAuthenticated, require('./comment').search);
    app.get('/comment/:id', IsAuthenticated, require('./comment').get);
    app.post('/comment/', IsAuthenticated, require('./comment').create);
    app.put('/comment/:id', IsAuthenticated, require('./comment').update);
    app.delete('/comment/:id', IsAuthenticated, require('./comment').delete);

    app.get('/units/', IsAuthenticated, require('./units').search);
    app.get('/units/:system', IsAuthenticated, require('./units').get);

    app.get('/usr/', IsAuthenticated, require('./usr').get);
    app.get('/usr/:id/form', IsAuthenticated, require('./usr').getusrform);
    app.post('/usr/:id/operate', IsAuthenticated, require('./usr').operateusr);

};
