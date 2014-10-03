var moment = require('moment');
var _ = require('underscore')._;

var common = require('./resource.common');

module.exports = {
    name: 'dataset',
    tableName: 'dataset',
    schema: {
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
            editable: false
        },
        // ----------------------
        createTime: {
            type: 'timestamp',
            includeToCreate: false,
            editable: false
        }
    },
    cassandraMap: {
        id: 'id',
        title: 'title',
        headPanelId: 'raw_data',
        owner: 'owner',
        createTime: 'create_time',
        source: 'source'
    },
    mapToCassandra: function (resource) {
        var cassandra = {};

        cassandra.id = resource.id;
        cassandra.name = resource.title;
        cassandra.raw_data = resource.headPanelId;
        cassandra.timezone = resource.timezone;
        cassandra.source = JSON.stringify(resource.source); // TODO(SRLM): This should give an error if this is not a JSON object
        cassandra.owner = resource.owner;
        cassandra.create_time = resource.createTime;

        _.each(cassandra, function (value, key) {
            if (typeof value === 'undefined') {
                delete cassandra[key];
            }
        });

        return cassandra;
    },
    mapToResource: function (cassandra) {
        var resource = {};

        resource.id = cassandra.id;

        resource.title = cassandra.name;
        resource.headPanelId = cassandra.raw_data;
        resource.owner = cassandra.owner;
        resource.createTime = cassandra.create_time.getTime();

        try {
            resource.source = JSON.parse(cassandra.source);
        } catch (e) {
            resource.source = {};
        }

        return resource;
    },
    populateOnCreate: function (newDataset) {
        newDataset.headPanelId = common.generateUUID();
        newDataset.source = {};
        newDataset.createTime = moment().valueOf();
    },
    checkResource: function (dataset, callback) {
        // TODO(SRLM): Need to check:
        // - owner is valid
        callback(null);
    },
    expand: function (parameters, dataset, callback) {
        callback(null, dataset);
//        var expandFunctions = {
//            owner: function(resource, expandCallback) {
//                userResource.get({id: resource.owner}, function(userList) {
//                    if (userList.length !== 1) {
//
//                    } else {
//                        resource.owner = userList[0];
//                    }
//                    expandCallback();
//                });
//            },
//            headPanel: function(resource, expandCallback) {
//                panelResource.get({id: resource.headPanelId}, function(panelList) {
//                    if (panelList.length !== 1) {
//
//                    } else {
//                        resource.headPanel = panelList[0];
//                    }
//                    expandCallback();
//                });
//            }
//        };
//        function getRelatedCount(id, callback) {
//            cassandraCustom.getDatasetCount(id, function(count) {
//                callback(count);
//            });
//        }
//        exports.getRelatedCount = getRelatedCount;
    }
};


//var eventResource = requireFromRoot('support/resources/event');
//var panelResource = requireFromRoot('support/resources/panel');
//var log = requireFromRoot('support/logger').log;
//var deletePre = function (id, continueCallback) {
//    exports.get({id: id}, function (datasets) {
//        if (datasets.length === 1) {
//            // Clean up associated resources
//            var dataset = datasets[0];
//            eventResource.deleteEventByDataset(id, function (errEvent) {
//                panelResource.delete(dataset.headPanelId, function (errPanel) {
//                    if (errEvent || errPanel) {
//                        log.error('Could error deleting associated resources with dataset ' + id + ': ' + errEvent + ', ' + errPanel);
//                        continueCallback(false);
//                    } else {
//                        continueCallback();
//                    }
//                });
//            });
//
//        } else {
//            log.debug('Invalid dataset id ' + id + ': gave ' + datasets.length + ' responses');
//            continueCallback(false);
//        }
//    });
//};

