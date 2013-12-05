
var database = require('./../support/database');

exports.get = function(req, res, next) {
    database.GetDatasetFormatted(req.params.uuid, function(dataset) {
        if (typeof dataset === "undefined") {
            next();
        } else {
            var content = [];
            content["title"] = dataset["name"];
            content["dataset"] = dataset;
            content["page_title"] = dataset["name"];
            res.render('datasetdisplay', content);
        }
    });
};