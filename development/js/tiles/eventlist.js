define(['vendor/jquery', 'vendor/underscore'], function($, _) {
    function eventList(sandbox, tile, configuration, doneCallback) {
        var datasetId;
        tile.setTitle('events');
        tile.addListener('totalState-resource-focused', resourceFocused);
        tile.addListener('totalState-resource-deleted', resourceDeleted);

        setEvents([]);

        doneCallback();

        function setEvents(events) {
            sandbox.requestTemplate('eventlist', function(template) {
                tile.place.html(template({events: _.sortBy(events, function(event) {
                        return event.startTime;
                    })}));

                // Listen for clicks on the checkbox
                tile.place.find('input:checkbox').on('click', function(event) {
                    console.log('Checkbox clicked. Row Name: ' + $(this).closest('tr').attr('name'));
                });

                tile.place.find('button[data-name=editevent]').on('click', function() {
                    var id = $(this).closest('tr').attr('name');
                    sandbox.displayEditResourceDialog('event', id);
                });

                tile.place.find('[name=delete-button]').on('click', function() {
                    console.log('Delete button clicked.');

                    tile.place.find('tbody tr td input:checked').each(function(index, element) {
                        var id = $(element).closest('tr').attr('name');
                        sandbox.delete('event', id);
                    });


                });

                // Listen for clicks on an event in table
                tile.place.find('tr td:nth-child(2), tr td:nth-child(3), tr td:nth-child(4)')
                        .on('click', function(event) {
                            var id = $(this).closest('tr').attr('name');
                            sandbox.resourceFocused('event', id);
                        });
            });
        }

        function resourceDeleted(event, parameters) {
            if (parameters.type === 'event') {
                console.log('Removing rows from table...');
                tile.place.find('tr[name=' + parameters.id + ']').each(function(index, row) {
                    $(row).addClass('danger').hide('slow');
                });
            }
        }

        function resourceFocused(event, parameters) {
            var newDatasetId = '';
            if (parameters.type === 'dataset') {
                newDatasetId = parameters.resource.id;
            } else if (parameters.type === 'event') {
                newDatasetId = parameters.resource.datasetId;
            }

            if (typeof datasetId === 'undefined'
                    || datasetId !== newDatasetId) {
                datasetId = newDatasetId;
                sandbox.get('event', {datasetId: datasetId}, setEvents);
            }
        }
    }

    return eventList;
});