
var underscore = require('underscore')._;
var async = require('async');

var config = require('./config');
config.ProcessCommandLine();

// Logging setup
var logger = requireFromRoot('support/logger');
logger.init('maintain', '0');
var log = logger.log; // console.log replacement
log.info("Maintain Node.js process started.");



//----------------------------------------------------------------------
MoveDatasetPanelMetaToPanelList();
//----------------------------------------------------------------------

function MoveDatasetPanelMetaToPanelList() {


    var panelResource = requireFromRoot('support/resources/panel');
    var datasetResource = requireFromRoot('support/resources/dataset');

// note: requires editing mapToResource so that it doesn't read from dataset.panels...
    datasetResource.getDatasets({}, function(datasets) {
        console.log('Updating ' + datasets.length + ' datasets');
        async.eachSeries(datasets, function(dataset, callback) {
            console.log('Calculating panel properties of ' + dataset.headPanelId + ' and createTime of ' + dataset.createTime);
            panelResource.calculatePanelProperties(dataset.headPanelId,
                    function(properties) {
                        console.log('Properties calculated.');
                        dataset.panels = {};
                        dataset.panels[dataset.headPanelId] =
                                {
                                    startTime: properties.startTime,
                                    endTime: properties.endTime,
                                    axes: [
                                        "gps:latitude",
                                        "gps:longitude",
                                        "gps:altitude",
                                        "gps:speed",
                                        "gps:satellite",
                                        "gps:hdop",
                                        "gps:magneticvariation",
                                        "gps:date",
                                        "gps:time",
                                        "rotationrate:x",
                                        "rotationrate:y",
                                        "rotationrate:z",
                                        "magneticfield:x",
                                        "magneticfield:y",
                                        "magneticfield:z",
                                        "pressure:pressure",
                                        "pressure:temperature",
                                        "acceleration:x",
                                        "acceleration:y",
                                        "acceleration:z"
                                    ],
                                    temporary: false,
                                    parent: null
                                };
                        datasetResource.updateDataset(
                                dataset.id,
                                {panels: dataset.panels},
                        function(err) {
                            if(err){
                                console.log('Error updating dataset: ' + err);
                            }else{
                                console.log('Updated dataset ' + dataset.id);
                            }
                            callback();
                        });
                    });
        }, function(err) {
            console.log('All done');
        });
    });
}
