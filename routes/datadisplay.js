
var database = require('./../support/database');

exports.get = function(req, res) {
    database.GetDatasetFormatted(req.params.uuid, function(content) {
        res.render('view_data', content);
    });
};