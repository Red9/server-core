
var validator = require('validator');
var cassandraPanel = require('./../datasources/cassandra_panel');

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

exports.deletePanel = function(panelId, callback){
  cassandraPanel.deletePanel(panelId, callback);  
};


exports.calculatePanelProperties = function(panelId, callback){
    cassandraPanel.calculatePanelProperties(panelId, callback);  
};