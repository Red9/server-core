
var sandbox = {
    init: function() {

        sandbox.setPageTitle('Red9 Sensor');
        
        History.Adapter.bind(window, 'statechange', sandbox.onHistoryChange); // Note: We are using statechange instead of popstate


        sandbox.templates = {};
        sandbox.modules = [];

        sandbox.div = $('#sandboxContentDiv');


        var tiles = [
            {
                class: eventList,
                configuration: {}
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'gps:speed'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'acceleration:x',
                        'acceleration:y',
                        'acceleration:z'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'rotationrate:x',
                        'rotationrate:y',
                        'rotationrate:z'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'magneticfield:x',
                        'magneticfield:y',
                        'magneticfield:z'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'pressure:pressure'
                    ]
                }
            },
            {
                class: googleMap,
                configuration: {}
            },
            {
                class: summaryStatistics,
                configuration: {}
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'gps:altitude'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'gps:hdop'
                    ]
                }
            },
            {
                class: panelGraph,
                configuration: {
                    axes: [
                        'gps:satellite'
                    ]
                }
            },
            {
                class: resourceDetails,
                configuration: {}
            }
        ];

        async.eachSeries(tiles,
                function(tile, doneCallback) {
                    var temp = $('<div></div>');
                    sandbox.div.append(temp);
                    sandbox.modules.push(new tile.class(temp, tile.configuration, function() {
                        doneCallback();
                    }));
                },
                function(err) {
                    sandbox.onHistoryChange();
                });

    },
    splicePanel: function(core, extra) {
        var result = _.omit(core, 'values');
        result.values = [];

        var i;
        // Add the dataset first "half"
        for (i = 0; i < extra.values.length
                && extra.values[i][0] < core.values[0][0]
                ; i = i + 1) {
            result.values.push(extra.values[i]);
        }

        // Add in the splice
        _.each(core.values, function(value, index) {
            result.values.push(value);
        });

        // Find the end of the splice
        for (; i < extra.values.length
                && extra.values[i][0] <= core.values[core.values.length - 1][0]
                ; i = i + 1) {
        }

        // Finish the dataset second "half"
        for (; i < extra.values.length; i = i + 1) {
            result.values.push(extra.values[i]);
        }

        return result;
    },
    trimPanel: function(panel, axes) {
        // Add in default of time
        var resultAxes = [panel.labels[0]];
        var indicies = [0];

        _.each(axes, function(desiredAxis) {
            var index = _.indexOf(panel.labels, desiredAxis);
            if (index !== -1) {
                resultAxes.push(desiredAxis);
                indicies.push(index);
            }
        });

        var resultPanel = _.omit(panel, ['labels', 'values']);
        resultPanel.labels = resultAxes;
        resultPanel.values = _.map(panel.values, function(row) {
            var resultRow = [];
            _.each(indicies, function(index) {
                resultRow.push(row[index]);
            });
            return resultRow;
        });

        return resultPanel;

    },
    get: function(resourceType, constraints, callback, expand) {
        if (resourceType === 'panel') {

            var panelParameters = {
                minmax: true,
                buckets: 1000,
                format: 'json'
            };

            if (typeof constraints.startTime !== 'undefined') {
                panelParameters.startTime = constraints.startTime;
            }
            if (typeof constraints.endTime !== 'undefined') {
                panelParameters.endTime = constraints.endTime;
            }

            $.ajax({
                type: 'GET',
                url: sandbox.apiUrl + '/panel/' + constraints.id + '/body/?' + $.param(panelParameters),
                dataType: 'json',
                success: function(panel) {
                    _.each(panel.values, function(row) {
                        row[0] = moment(row[0]).toDate();
                    });
                    callback(panel);
                }
            });



        } else {


            if (typeof expand !== 'undefined') {
                constraints.expand = "";
                _.each(expand, function(value, index) {
                    if (index > 0) {
                        constraints.expand += ',';
                    }
                    constraints.expand += value;
                });
            }

            $.ajax({
                type: 'GET',
                url: sandbox.apiUrl + '/' + resourceType + '/?' + $.param(constraints),
                dataType: 'json',
                success: callback
            });
        }
    },
    getSplicedPanel: function(panelId, startTime, endTime, callback) {
        var callback = arguments[arguments.length - 1];
        sandbox.get('panel', {id: panelId}, function(datasetPanel) {

            if (_.isFunction(startTime) === true // Then not specified at all
                    || (datasetPanel.startTime === startTime && datasetPanel.endTime === endTime)) {
                //No splicing necessary
                callback(datasetPanel);
            } else {
                sandbox.get('panel', {id: panelId, startTime: startTime, endTime: endTime}, function(corePanel) {
                    var finalPanel = sandbox.splicePanel(corePanel, datasetPanel);
                    callback(finalPanel);
                });
            }

        });
    },
    testPanelStuff: function() {
        // 1395117401000
        // 1395117770910

        var constraints = {
            startTime: 1395117401000,
            endTime: 1395117770910,
            id: '29b2038c-21cd-41bb-f103-9402f3a895cc'
        };

        sandbox.getSplicedPanel('29b2038c-21cd-41bb-f103-9402f3a895cc', 1395117501000, 1395117670910,
                function(splicedPanel) {
                    console.log("Got panel: " + JSON.stringify(_.omit(splicedPanel, 'values')));
                    console.log('Panel values length: ' + splicedPanel.values.length);
                });

    },
    set: function(type) {


    },
    requestTemplate: function(name, callback) {
        if (typeof sandbox.templates[name] === 'undefined') {
            $.ajax({
                url: '/templates/' + name + '.html',
                datatype: 'text/javascript',
                success: function(response, status, jqXHR) {
                    sandbox.templates[name] = Handlebars.compile(response);
                    callback(sandbox.templates[name]);
                }

            });
        } else {
            callback(sandbox.templates[name]);
        }
    },
    resourceFocused: function(type, id, startTime, endTime) {
        var uri = URI();

        if (typeof type !== 'undefined' && typeof id !== 'undefined') {
            uri.directory(type);
            uri.filename(id);
        } else { // Default to dataset ID
            throw 'Must define a resource type and id to focus on.';
        }

        var focus = {};
        if (typeof startTime !== 'undefined') {
            focus['focus.starttime'] = startTime;
        }

        if (typeof endTime !== 'undefined') {
            focus['focus.endtime'] = endTime;
        }

        uri.query(focus);

        History.pushState(null, 'Focusing on ' + type + ' ' + id, uri.toString());
    },
    initiateEvent: function(eventName, parameters) {
        $(sandbox).trigger(eventName, parameters);
    },
    setPageTitle: function(newTitle){
        $(document).attr('title', newTitle);
    },
    initiateResourceFocusedEvent: function(resource, id, startTime, endTime) {
        var eventName = 'totalState.resource-focused';
        
        
        
        
        if (resource === 'event') {
            sandbox.get(resource, {id: id}, function(event) {
                if (typeof startTime === 'undefined') {
                    startTime = event[0].startTime;
                }
                if (typeof endTime === 'undefined') {
                    endTime = event[0].endTime;
                }
                sandbox.get('dataset', {id: event[0].datasetId}, function(dataset) {
                    sandbox.getSplicedPanel(dataset[0].headPanelId, startTime, endTime, function(panel) {
                        sandbox.setPageTitle('Event: ' + event[0].type);
                        sandbox.initiateEvent(eventName,
                                {
                                    type: resource,
                                    resource: event[0],
                                    panel: panel
                                });
                    });
                });
            });
        } else if (resource === 'dataset') {
            sandbox.get(resource, {id: id}, function(dataset) {
                if (typeof startTime === 'undefined') {
                    startTime = dataset[0].headPanel.startTime;
                }
                if (typeof endTime === 'undefined') {
                    endTime = dataset[0].headPanel.endTime;
                }
                sandbox.getSplicedPanel(dataset[0].headPanel.id, startTime, endTime, function(panel) {
                    sandbox.setPageTitle(dataset[0].title);
                    sandbox.initiateEvent(eventName,
                            {
                                type: resource,
                                resource: dataset[0],
                                panel: panel
                            });
                });
            }, ['headPanel']);
        }
    },
    onHistoryChange: function() {
        // Bound to StateChange Event
        var State = History.getState(); // Note: We are using History.getState() instead of event.state
        var uri = URI(State.url);

        var query = uri.query(true);

        var resource = uri.directory().substring(1); // remove leading '/'
        var id = uri.filename();

        sandbox.initiateResourceFocusedEvent(resource, id, query['focus.starttime'], query['focus.endtime']);
    }

};

$(document).ready(function() {
    sandbox.init();

});