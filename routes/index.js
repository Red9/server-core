
/*
 * GET home page.
 */


function IsAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        next();
    }else{
        //next();
        res.redirect('/login');
    }
}



module.exports = function(app, passport) {
    
    
    
    
    app.get('/login', require('./login').get);
    app.get('/logout', require('./logout').get);

    app.get('/login/google', passport.authenticate('google'));
    app.get('/login/google/return', passport.authenticate('google', 
    {successRedirect: '/view/index',
        failureRedirect: '/login'
    }));
    

    //app.get('/', require('./login').get);
    app.get('/user/:param', require('./user').get);
    
    
    app.get('/map', function(req, res){
        res.render('map');
    });
    
    
    app.get('/ping', IsAuthenticated, require('./ping').get);



    app.get('/upload/rnb', IsAuthenticated, require('./rnbupload').get);
    app.post('/upload/process', IsAuthenticated, require('./rnbprocess').post);
    app.get('/view/data/:uuid', IsAuthenticated, require('./datadisplay').get);
    app.get('/view/index', IsAuthenticated, require('./dataindex').get);
    app.get('/', IsAuthenticated, require('./dataindex').get);
    
    app.get('/download/raw_data/:uuid/form', IsAuthenticated, require('./download_raw_data_form').get);
    app.get('/download/raw_data/:uuid', IsAuthenticated, require('./get_raw_data').get);
    app.get('/delete/:uuid', IsAuthenticated, require('./delete_dataset').get);

    app.get('/monitor', IsAuthenticated, require('./monitoring_tools').get);
};


/*
 exports.index = function(req, res){
 res.render('index', { title: 'Home' });
 };
 */