define(['vendor/jquery', 'vendor/underscore',
    'utilities/eventtimeline'
], function($, _, eventTimeline) {
    function eventList(sandbox, tile, configuration, doneCallback) {
        var timeline;

        initialize(doneCallback);

        function initialize(callback) {
            tile.setTitle('events');
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-resource-deleted', resourceChanged);
            tile.addListener('totalState-resource-created', resourceChanged);
            tile.addListener('totalState-hover-time', hoverTime);
            tile.addListener('totalState-video-time', videoTime);

            tile.addToBar('deleteevents', '', 'glyphicon-trash', deleteSelected);
            tile.addToBar('editevent', '', 'glyphicon-pencil', editSelected);

            if (typeof configuration.showMarkers === 'undefined') {
                configuration.showMarkers = true;
            }

            sandbox.requestTemplate('eventlist', function(template) {
                tile.place.html(template({}));

                timeline = eventTimeline(
                        tile.place.find('[data-name=timeline]'),
                        {
                            hoverTime: hoverTimeUpdate,
                            eventClicked: eventClicked,
                            emptyRightClick: emptyRightClick
                        });
                setEvents([]);
                callback();
            });
        }
        
        function editSelected(){
            var selected = timeline.getSelected();
            if(selected.length > 1){
                alert('Sorry, you can only edit one event at a time.');
            }else if(selected.length === 1){
                sandbox.displayEditResourceDialog('event', selected[0]);
            }
        }

        function deleteSelected() {
            sandbox.delete('event', timeline.getSelected());
        }

        function eventClicked(id) {
            sandbox.initiateResourceFocusedEvent('event', id);
        }
        function hoverTimeUpdate(time) {
            sandbox.initiateHoverTimeEvent(time);
        }

        function emptyRightClick() {
            sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDataset());
        }

        function setEvents(events) {
            timeline.set(events,
                    sandbox.focusState.startTime,
                    sandbox.focusState.endTime);
        }

        function resourceChanged(event, parameters) {
            if (parameters.type === 'event') {
                sandbox.get('event', {datasetId: sandbox.getCurrentDataset()}, setEvents);
            }
        }

        function resourceFocused(event, parameter) {
            var newDatasetId;
            if (parameter.type === 'dataset') {
                newDatasetId = sandbox.getCurrentDataset();
            } else if (parameter.type === 'event') {
                newDatasetId = sandbox.focusState.event.datasetId;
            }

            if (typeof newDatasetId !== 'undefined') {
                sandbox.get('event', {datasetId: newDatasetId}, setEvents);
            }
        }

        function videoTime(event, parameter) {
            if (configuration.showMarkers === true) {
                timeline.setVideoMarker(parameter.videoTime);
            } else {
                timeline.clearVideoMarker();
            }
        }

        function hoverTime(event, parameter) {
            if (configuration.showMarkers === true) {
                timeline.setHoverMarker(parameter.hoverTime);
            } else {
                timeline.clearHoverMarker();
            }
        }


        function destructor() {
            setEvents([]);
            tile.destructor();
            $
                    = _
                    = sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;

        }

        return {
            destructor: destructor
        };
    }

    return eventList;
});