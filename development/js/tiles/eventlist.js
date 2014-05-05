define(['vendor/jquery', 'vendor/underscore', 'utilities/eventtimeline'
], function($, _, eventTimeline) {
    function eventList(sandbox, tile, configuration, doneCallback) {
        var timeline;



        initialize(doneCallback);



        function initialize(callback) {
            tile.setTitle('events');
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-resource-deleted', resourceDeleted);
            
            tile.addToBar('delete-events', '', 'glyphicon-trash', deleteSelected);

            sandbox.requestTemplate('eventlist', function(template) {
                tile.place.html(template({}));

                timeline = eventTimeline(
                        tile.place.find('[data-name=timeline]'),
                        {
                            hoverTime: hoverTimeUpdate,
                            eventClicked: eventClicked
                        });
                setEvents([]);
                callback();
            });
        }
        
        function deleteSelected(){
            //console.log(timeline.getSelected());
            sandbox.delete('event', timeline.getSelected());
        }

        function eventClicked(id) {
            sandbox.initiateResourceFocusedEvent('event', id);
        }
        function hoverTimeUpdate(time) {
            sandbox.initiateHoverTimeEvent(time);
        }

        function setEvents(events) {
            timeline.set(events,
                    sandbox.focusState.startTime,
                    sandbox.focusState.endTime);
        }

        function resourceDeleted(event, parameters) {
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