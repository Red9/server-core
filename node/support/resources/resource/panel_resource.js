var moment = require('moment');
var validator = require('validator');

var cassandraPanel = require('./../datasources/cassandra_panel');

var common = require('./../common');
var datasetResource = require('./dataset_resource');

/**
 * 
 * @param {type} constraints
 * @param {type} panelParameters
 * @param {function} callbackDataset (dataset object)
 * @param {function} callbackData (csv row) 
 * @param {function} callbackDone (err)
 * @returns {undefined}
 */
exports.getPanel = function(constraints, panelParameters,
        callbackDataset, callbackData, callbackDone) {

    if (validator.isUUID(constraints.dataset)) {
        cassandraPanel.getPanelFromDataset(constraints.dataset, panelParameters,
                callbackDataset, callbackData, callbackDone);
    } else { // Some other constraint?
        //TODO (SRLM): Add other constraint options.
        callbackDone("Bad constraints.");
    }

};


exports.createTemporaryPanel = function(datasetId, callback){
    datasetResource.getDatasets({id:datasetId}, function(datasetList){
        // Verify that the dataset exists
       if(datasetList.length !== 1){
           callback('Incorrect number of datasets for id ' + datasetId + ': ' + datasetList.length);
       } else{
           // Add new panel key to dataset.
           var temporaryId = common.generateUUID();
           var alternatePanels = datasetList[0].alternatePanels;
           alternatePanels.temporaryPanels.push({
              id:temporaryId,
              createTime: moment().valueOf(),
              creator:'',
              axes:[]
           });
           var updatedDataset = {alternatePanels:alternatePanels};
           datasetResource.updateDataset(datasetId, updatedDataset, function(err, changes){
               if(err){
                   callback('Could not update dataset');
               }else{
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
exports.deletePanel = function(panelId, callback){
  cassandraPanel.deletePanel(panelId, callback);  
};

/**
 * 
 * @param {type} panelId the actual raw data panel ID (not dataset ID)
 * @param {type} callback ({ } ) Calls with an object with the calculated properties.
 * @returns {undefined}
 */
exports.calculatePanelProperties = function(panelId, callback){
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
exports.addRows = function(panelId, rows, callback){
   cassandraPanel.addRows(panelId, rows, callback); 
};

