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

    app.get('/summarystatistics/:id', require('./summarystatistics').calculate);


    // Resources
    var common = requireFromRoot('api/routes/common');
    var resourceRoutes = requireFromRoot('api/routes/resourceroutes');
    common.addRoutesToApp(app, resourceRoutes.dataset);
    common.addRoutesToApp(app, resourceRoutes.event);
    common.addRoutesToApp(app, resourceRoutes.user);
    common.addRoutesToApp(app, resourceRoutes.panel);
    common.addRoutesToApp(app, resourceRoutes.comment);
    common.addRoutesToApp(app, resourceRoutes.video);

    // A hack for now:
    app.get('/eventtype/', function(req, res, next) {
        res.json(
                [
                    {name: "Default"},
                    {name: "Wave: Left"},
                    {name: "Wave: Right"},
                    {name: "Wave"},
                    {name: "Drop In"},
                    {name: "Bottom Turn"},
                    {name: "Snap"},
                    {name: "Snap: Closeout"},
                    {name: "Air Drop"},
                    {name: "Cutback"},
                    {name: "Floater"},
                    {name: "Carve"},
                    {name: "Tail Slide"},
                    {name: "Pump"},
                    {name: "360"},
                    {name: "Reverse"},
                    {name: "Air"},
                    {name: "Paddle for Wave"},
                    {name: "Paddle Out"},
                    {name: "Paddle In"},
                    {name: "Paddle Left"},
                    {name: "Paddle Right"},
                    {name: "Paddle"},
                    {name: "Duck Dive"},
                    {name: "Wipe out"},
                    {name: "Pearling"},
                    {name: "Session"},
                    {name: "Walk"},
                    {name: "Run"},
                    {name: "Stationary"},
                    {name: "Dolphin"}
                ]
                );
    });
};
