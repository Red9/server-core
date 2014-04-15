function defaultHandler(req, res, next) {
    res.json({message: 'ACTION server'});
}

module.exports = function(app) {
    app.get('/', defaultHandler);
    
    
    app.post('/upload/rnc', require('./rncprocess').post);
    
};