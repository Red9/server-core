
var datasetResource = requireFromRoot('support/resources/dataset');

exports.get = function(req, res) {
    var parameters = {page_title: "Available Datasets", datasets: []};



    datasetResource.get({}, function(datasets) {
        parameters['datasets'] = datasets;
        res.render('datasetindex', parameters);
    });
};

