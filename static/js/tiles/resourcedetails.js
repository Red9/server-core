define(['vendor/jquery', 'vendor/underscore', 'utilities/commentList'], function($, _) {
    function resourceDetails(sandbox, tile, configuration, doneCallback) {
        function init() {
            tile.setTitle('details');

            if (typeof configuration.type !== 'undefined'
                    && configuration.id !== 'undefined') {
                setResource(configuration.type, configuration.id);
            } else {
                tile.addListener('totalState-resource-focused', resourceFocused);
                // Default to what's currently visible
                setResource('dataset', sandbox.getCurrentDatasetId());
            }
            doneCallback();
        }

        function calculateAggregatedEvents(datasetId, callback) {
            if (typeof datasetId === 'undefined') {
                callback();
                return;
            }
            sandbox.get('dataset', {id: datasetId}, function(datasetList) {
                var dataset = datasetList[0];
                var datasetDuration = dataset.headPanel.endTime - dataset.headPanel.startTime;
                sandbox.get('event', {datasetId: datasetId}, function(events) {
                    callback(
                            _.sortBy(
                                    _.map(
                                            _.toArray(
                                                    _.reduce(events, function(memo, event) {
                                                        if (_.has(memo, event.type) === false) {
                                                            memo[event.type] = {
                                                                type: event.type,
                                                                count: 0,
                                                                duration: 0
                                                            };
                                                        }
                                                        memo[event.type].count += 1;
                                                        memo[event.type].duration += (event.endTime - event.startTime);
                                                        return memo;
                                                    }, {})), function(aggregatedEvent) {
                                        aggregatedEvent.durationPercent = aggregatedEvent.duration / datasetDuration;
                                        return aggregatedEvent;
                                    }), function(aggregatedEvent) {
                                return aggregatedEvent.type;
                            }));
                });
            }, ['headPanel', 'owner']);
        }

        function calculateEventIndex(datasetId, eventId, callback) {
            sandbox.get('event', {datasetId: datasetId}, function(eventList) {
                var eventType = _.find(eventList, function(event) {
                    return event.id === eventId;
                }).type;

                var eventTypeList = _.filter(eventList, function(event) {
                    return event.type === eventType;
                });
                var index =
                        _.reduce(
                                _.sortBy(eventTypeList, function(event) {
                                    return event.startTime;
                                }), function(memo, event, index) {
                            return event.id === eventId ? index : memo;
                        });

                callback({
                    index: index,
                    total: eventTypeList.length
                });
            });
        }

        function setResource(type, id) {
            var expand = type === 'dataset' ? ['headPanel', 'owner'] : undefined;
            sandbox.get(type, {id: id}, function(resourceList) {
                var resource = resourceList.length === 0 ? {} : resourceList[0];
                sandbox.requestTemplate('resourcedetails.' + type, function(template) {
                    var parameters = {
                        apiUrl: sandbox.apiUrl,
                        type: type.charAt(0).toUpperCase() + type.slice(1)
                    };
                    parameters[type] = resource;

                    if (type === 'dataset') {
                        calculateAggregatedEvents(id, function(aggregation) {
                            parameters.aggregation = aggregation;
                            tile.place.html(template(parameters));
                        });
                    } else if (type === 'event') {
                        calculateEventIndex(resource.datasetId, resource.id, function(eventIndex) {
                            eventIndex.index += 1; // move from 0 index to 1 index
                            parameters.eventIndex = eventIndex;
                            tile.place.html(template(parameters));
                        });

                    } else {
                        tile.place.html(template(parameters));
                    }
                });
            }, expand);
        }

        function resourceFocused(event, parameter) {
            setResource(parameter.type, parameter.id);
        }

        function destructor() {
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;
        }

        init();
        return {
            destructor: destructor
        };
    }

    return resourceDetails;
});