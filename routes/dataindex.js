
var database = require('./../support/database');

exports.get = function(req, res) {
    var parameters = {title: "Available Datasets", datasets: []};

    database.GetAllDataset(function(datasets) {
        parameters['datasets'] = datasets;
        res.render('view_data_index', parameters);
    });

};

