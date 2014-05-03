define(['vendor/jquery', 'vendor/underscore'
], function($,_) {
    function sandboxEvents(sandbox) {
        function initiateEvent(eventName, parameters) {
            $(sandbox).trigger(eventName, parameters);
        }
        sandbox.initiateVideoTimeEvent = function(videoTime) {
            var eventName = 'totalState-video-time';
            initiateEvent(eventName, {videoTime: videoTime});
        };
        sandbox.initiateHoverTimeEvent = function(hoverTime) {
            var eventName = 'totalState-hover-time';
            initiateEvent(eventName, {hoverTime: hoverTime});
        };
        sandbox.initiateResourceDeletedEvent = function(resource, id) {
            var eventName = 'totalState-resource-deleted';
            initiateEvent(eventName, {type: resource, id: id});
        };
        sandbox.initiateResourceFocusedEvent = function(type, id, startTime, endTime, callbackDone) {
            var eventName = 'totalState-resource-focused';
            if (type === 'event') {
                sandbox.get(type, {id: id}, function(event) {
                    sandbox.get('dataset', {id: event[0].datasetId}, function(dataset) {
                        startTime = event[0].startTime;
                        endTime = event[0].endTime;
                        sandbox.getPanel(dataset[0].headPanelId, startTime, endTime, true, function(panel) {
                            sandbox.setPageTitle('Event: ' + event[0].type);

                            sandbox.focusState.dataset = undefined;
                            sandbox.focusState.minStartTime = dataset[0].headPanel.startTime;
                            sandbox.focusState.maxEndTime = dataset[0].headPanel.endTime;
                            sandbox.focusState.startTime = startTime;
                            sandbox.focusState.endTime = endTime;
                            sandbox.focusState.event = event[0];
                            sandbox.focusState.panel = panel;

                            initiateEvent(eventName,
                                    {
                                        type: type,
                                        panel: panel
                                    });
                            callbackDone();
                        });
                    }, ['headPanel']);
                });
            } else if (type === 'dataset') {
                sandbox.get(type, {id: id}, function(dataset) {
                    if (typeof dataset[0].headPanel === 'undefined'
                            || _.keys(dataset[0].headPanel.summaryStatistics).length === 0) {
                        // For the case when the the dataset has just been
                        // uploaded, and processing is not done yet.
                        setTimeout(function() {
                            sandbox.initiateResourceFocusedEvent(type, id, startTime, endTime, callbackDone);
                        }, 1000);
                        return;
                    }
                    var cache = typeof startTime === 'undefined' && typeof endTime === 'undefined';
                    if (typeof startTime === 'undefined') {
                        startTime = dataset[0].headPanel.startTime;
                    }
                    if (typeof endTime === 'undefined') {
                        endTime = dataset[0].headPanel.endTime;
                    }
                    sandbox.getPanel(dataset[0].headPanel.id, startTime, endTime, cache, function(panel) {
                        sandbox.setPageTitle(dataset[0].title);

                        sandbox.focusState.dataset = dataset[0];
                        sandbox.focusState.minStartTime = dataset[0].headPanel.startTime;
                        sandbox.focusState.maxEndTime = dataset[0].headPanel.endTime;
                        sandbox.focusState.startTime = startTime;
                        sandbox.focusState.endTime = endTime;
                        sandbox.focusState.panel = panel;
                        sandbox.focusState.event = undefined;

                        initiateEvent(eventName,
                                {
                                    type: type,
                                    panel: panel
                                });
                        callbackDone();
                    });
                }, ['headPanel', 'owner']);
            }
        };
    }
    return sandboxEvents;
});