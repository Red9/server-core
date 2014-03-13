function defaultHandler(req, res, next) {
    res.json({message: 'Welcome home!'});
}

module.exports = function(app, passport) {
    // --------------------------------------------
    // Authentication Barrier
    // --------------------------------------------
    app.get('/', defaultHandler);

    app.get('/usr/', require('./usr').get);
    app.get('/usr/:id/form', require('./usr').getusrform);
    app.post('/usr/:id/operate', require('./usr').operateusr);


    // Resources
    var common = requireFromRoot('api/routes/common');
    var resourceRoutes = requireFromRoot('api/routes/resourceRoutes');
    common.addRoutesToApp(app, resourceRoutes.dataset);
    common.addRoutesToApp(app, resourceRoutes.event);
    common.addRoutesToApp(app, resourceRoutes.user);
    common.addRoutesToApp(app, resourceRoutes.panel);
};
