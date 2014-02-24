
var validator = require('validator');
var cassandraPanel = require('./../datasources/cassandra_panel');
var datasetResource = require('./dataset_resource');
var common = require('./../common');
var moment = require('moment');

var underscore = require('underscore')._;

/**
 * 
 * @param {type} constraints
 * @param {type} panelParameters
 * @param {function} callbackDataset (dataset object)
 * @param {function} callbackData (csv row) 
 * @param {function} callbackDone (err)
 * @returns {undefined}
 */
/*exports.getPanel = function(constraints, panelParameters,
 callbackDataset, callbackData, callbackDone) {
 
 if (validator.isUUID(constraints.dataset)) {
 cassandraPanel.getPanelFromDataset(constraints.dataset, panelParameters,
 callbackDataset, callbackData, callbackDone);
 } else { // Some other constraint?
 //TODO (SRLM): Add other constraint options.
 callbackDone("Bad constraints.");
 }
 
 };
 */
/** 
 * TODO(SRLM): Add callback axes?
 * @param {type} options
 * @param {type} callbackDataset
 * @param {type} callbackData
 * @param {type} callbackDone
 * @returns {undefined}
 */
exports.getPanel = function(options,
        callbackAxes, callbackData, callbackDone) {

    var datasetId = options.datasetId;
    var panelId = options.panelId;
    var startTime = options.startTime;
    var endTime = options.endTime;
    var minmax = options.minmax;
    var cache = options.cache;
    var buckets = options.buckets;
    var axes = options.axes;

    // Get the dataset
    datasetResource.getDatasets({id: datasetId}, function(datasetList) {
        if (datasetList.length !== 1) {
            callbackDone('incorrect number of datasets ' + datasetList.length + ' for ' + datasetId);
        } else {
            var dataset = datasetList[0];
            if (typeof panelId === 'undefined') {
                // Default to HEAD
                panelId = dataset.headPanelId;
            }

            if (typeof dataset.panels[panelId] === 'undefined') {
                callbackDone('invalid panel ' + panelId + ' for dataset ' + datasetId);
            } else {
                // TODO: possible slight optimization option: if axes is undefined
                // we want all of them. Let's save it as undefined and just return
                // all later, instead of slicing and dicing.
                if (typeof axes === 'undefined') {
                    axes = dataset.panels[panelId].axes;
                    if (typeof axes === 'undefined') {
                        // For the case where no panel is defined.
                        axes = [];
                    }
                }

                // Limit to just the axes in the panel
                axes = underscore.intersection(axes, dataset.panels[panelId].axes);

                // Find what index those axis values are at
                var axesIndex = underscore.map(axes, function(axis) {
                    return dataset.panels[panelId].axes.indexOf(axis);
                });

                callbackAxes(axes);


                if (typeof startTime === 'undefined') {
                    startTime = dataset.panels[panelId].startTime;
                }
                if (typeof endTime === 'undefined') {
                    endTime = dataset.panels[panelId].endTime;
                }
                if (underscore.isBoolean(minmax) === false) {
                    minmax = false;
                }
                if (underscore.isBoolean(cache) === false) {
                    cache = false;
                }



                var valueFunction = function(time, values, rowIndex) {
                    var resultValues = underscore.map(axesIndex, function(index) {
                        return values[index];
                    });
                    callbackData(time, resultValues, rowIndex);
                };

                var databaseDoneFunction = function(err) {
                    callbackDone(err);
                };

                if (typeof buckets === 'undefined') {
                    // Get "plain" panel
                    cassandraPanel.getPanel(panelId, startTime, endTime,
                            valueFunction, databaseDoneFunction);
                }
                else { // Get bucketed panel
                    cassandraPanel.getBucketedPanel(panelId, startTime, endTime,
                            buckets, minmax, cache,
                            valueFunction, databaseDoneFunction);
                }


            }

        }
    });




};


exports.createTemporaryPanel = function(datasetId, callback) {
    datasetResource.getDatasets({id: datasetId}, function(datasetList) {
        // Verify that the dataset exists
        if (datasetList.length !== 1) {
            callback('Incorrect number of datasets for id ' + datasetId + ': ' + datasetList.length);
        } else {
            // Add new panel key to dataset.
            var temporaryId = common.generateUUID();
            var alternatePanels = datasetList[0].alternatePanels;
            alternatePanels.temporaryPanels.push({
                id: temporaryId,
                createTime: moment().valueOf(),
                creator: '',
                axes: []
            });
            var updatedDataset = {alternatePanels: alternatePanels};
            datasetResource.updateDataset(datasetId, updatedDataset, function(err, changes) {
                if (err) {
                    callback('Could not update dataset');
                } else {
                    callback(undefined, temporaryId);
                }
            });
        }
    });
};

/**
 * 
 * @param {type} panelId the actual raw data panel ID (not dataset ID)
 * @param {type} callback
 * @returns {undefined} */
exports.deletePanel = function(panelId, callback) {
    cassandraPanel.deletePanel(panelId, callback);
};

/**
 * 
 * @param {type} panelId the actual raw data panel ID (not dataset ID)
 * @param {type} callback ({ } ) Calls with an object with the calculated properties.
 * @returns {undefined}
 */
exports.calculatePanelProperties = function(panelId, callback) {
    cassandraPanel.calculatePanelProperties(panelId, callback);
};


/**
 * 
 * @param {type} panelId
 * @param {type} time in MS since epoch
 * @param {type} row list of float values
 * @param {type} callback
 * @returns {undefined}
 */
exports.addRows = function(panelId, rows, callback) {
    cassandraPanel.addRows(panelId, rows, callback);
};

