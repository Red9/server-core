
var datasetResource = requireFromRoot('support/resources/dataset');

exports.get = function(req, res) {
    var parameters = {page_title: "Available Datasets", datasets: []};



    datasetResource.getDatasets({}, function(datasets) {
        datasetResource.flushDatasets(datasets, function(flushedDatasets) {
            parameters['datasets'] = flushedDatasets;
            res.render('datasetindex', parameters);
        });
    });
};

