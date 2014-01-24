
var database = require('./../support/database');

exports.get = function(req, res) {
    var parameters = {page_title: "Available Datasets", datasets: []};

    database.GetAllRows("dataset", function(datasets) {
        parameters['datasets'] = datasets;
        res.render('datasetindex', parameters);
    });

};

