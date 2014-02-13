
var log = require('./../../support/logger').log;

var datasetResource = require('./../../support/resources/resource/dataset_resource');

exports.get = function(req, res, next){
    if (typeof req.params.uuid === "undefined") {
        log.error("UUID should not be undefined!");        
        next();
    }
    
    datasetResource.getDatasets({id:req.params.uuid}, function(content){
        if(content.length !== 1){
            next();
        }else{
            // TODO(SRLM): This isn't very clean...
            var dataset = content[0];
            dataset["page_title"] = "Custom Download";
            res.render("customdownload", dataset);
        }
    });
};

