
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
        log.debug('Updating ' + datasets.length + ' datasets');
        async.eachSeries(datasets, function(dataset, callback) {
            log.debug('Calculating panel properties of ' + dataset.headPanelId);
            panelResource.calculatePanelProperties(dataset.headPanelId,
                    function(properties) {
                        log.debug('Properties calculated.');
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
                                log.error('Error updating dataset: ' + err);
                            }else{
                                log.debug('Updated dataset ' + dataset.id);
                            }
                            callback();
                        });
                    });
        }, function(err) {
            log.debug('All done');
        });
    });
}
