var moment = require('moment');
var underscore = require('underscore')._;

var config = requireFromRoot('config');
var log = requireFromRoot('support/logger').log;

var common = requireFromRoot('support/resourcescommon');
var useful = requireFromRoot('support/useful');

var userResource = requireFromRoot('support/resources/user');
var eventResource = requireFromRoot('support/resources/event');
var panelResource = requireFromRoot('support/resources/panel');

var datasetResource = {
    title: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    owner: {
        type: 'uuid',
        includeToCreate: true,
        editable: true
    },
    // --------------------
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    headPanelId: {
        type: 'uuid',
        includeToCreate: false,
        editable: true
    },
    source: {// TODO(SRLM): Rename this to recorderInformation (or something...)
        type: 'object',
        includeToCreate: false,
        editable: true
    },
    // ----------------------
    createTime: {
        type: 'timestamp',
        includeToCreate: false,
        editable: false
    }
};

function mapToCassandra(resource) {
    var cassandra = {};

    cassandra.id = resource.id;
    cassandra.name = resource.title;
    cassandra.raw_data = resource.headPanelId;
    cassandra.timezone = resource.timezone;
    cassandra.source = JSON.stringify(resource.source); // TODO(SRLM): This should give an error if this is not a JSON object
    cassandra.owner = resource.owner;

    if (typeof resource.createTime !== 'undefined') {
        cassandra.create_time = moment(resource.createTime).toDate();
    }

    underscore.each(cassandra, function(value, key) {
        if (typeof value === 'undefined') {
            delete cassandra[key];
        }
    });

    return cassandra;
}


function mapToResource(cassandra) {
    var resource = {};

    resource.id = cassandra.id;

    resource.title = cassandra.name;
    resource.headPanelId = cassandra.raw_data;
    resource.owner = cassandra.owner;
    resource.createTime = moment(cassandra.create_time).valueOf();

    try {
        resource.source = JSON.parse(cassandra.source);
    } catch (e) {
        resource.source = {};
    }

    return resource;
}

var createFlush = function(newDataset) {
    newDataset.id = useful.generateUUID();
    newDataset.headPanelId = useful.generateUUID();
    newDataset.source = {};
    newDataset.createTime = moment().valueOf();
};

var deletePre = function(id, continueCallback) {
    exports.get({id: id}, function(datasets) {
        if (datasets.length === 1) {
            // Clean up associated resources
            var dataset = datasets[0];
            eventResource.deleteEventByDataset(id, function(errEvent) {
                panelResource.delete(dataset.headPanelId, function(errPanel) {
                    if (errEvent || errPanel) {
                        log.error('Could error deleting associated resources with dataset ' + id + ': ' + errEvent + ', ' + errPanel);
                        continueCallback(false);
                    } else {
                        continueCallback();
                    }
                });
            });

        } else {
            log.debug('Invalid dataset id ' + id + ': gave ' + datasets.length + ' responses');
            continueCallback(false);
        }
    });
};

var expandFunctions = {
    owner: function(resource, expandCallback) {
        userResource.get({id: resource.owner}, function(userList) {
            if (userList.length !== 1) {

            } else {
                resource.owner = userList[0];
            }
            expandCallback();
        });
    },
    headPanel: function(resource, expandCallback) {
        panelResource.get({id: resource.headPanelId}, function(panelList) {
            if (panelList.length !== 1) {

            } else {
                resource.headPanel = panelList[0];
            }
            expandCallback();
        });
    }
};



exports.resource = {
    name:'dataset',
    mapToCassandra: mapToCassandra,
    mapToResource: mapToResource,
    cassandraTable: 'dataset',
    schema: datasetResource,
    create: {
        flush: createFlush
    },
    delete: {
        pre: deletePre
    },
    get: {
        expandFunctions: expandFunctions
    }
};


exports.create = function(newDataset, callback) {
    common.createResource(exports.resource, newDataset, callback);
};

exports.delete = function(id, callback) {
    common.deleteResource(exports.resource, id, callback);
};

exports.update = function(id, modifiedDataset, callback, forceEditable) {
    common.updateResource(exports.resource, id, modifiedDataset, callback, forceEditable);
};

exports.get = function(constraints, callback, expand) {
    common.getResource(exports.resource, constraints, callback, expand);
};