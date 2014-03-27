function eventList(myPlace, configuration, doneCallback) {

    this.myPlace = myPlace;
    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));
    $(sandbox).on('totalState.resource-deleted', $.proxy(this.resourceDeleted, this));

    this.setEvents([]);

    doneCallback();
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------


eventList.prototype.setEvents = function(events) {
    var self = this;
    sandbox.requestTemplate('eventlist', function(template) {
        self.myPlace.html(template({events: events}));

        // Listen for clicks on the checkbox
        self.myPlace.find('input').on('click', function(event) {
            console.log('Checkbox clicked. Row Name: ' + $(this).closest('tr').attr('name'));
        });

        self.myPlace.find('[name=delete-button]').on('click', function() {
            console.log('Delete button clicked.');

            self.myPlace.find('tbody tr td input:checked').each(function(index, element) {
                var id = $(element).closest('tr').attr('name');
                sandbox.delete('event', id);
            });


        });

        // Listen for clicks on an event in table
        self.myPlace.find('tr td:nth-child(n+2)').on('click', function(event) {
            var id = $(this).closest('tr').attr('name');
            sandbox.resourceFocused('event', id);
        });
    });
};

eventList.prototype.resourceDeleted = function(event, parameters) {
    if (parameters.type === 'event') {
        console.log('Removing rows from table...');
        this.myPlace.find('tr[name=' + parameters.id + ']').each(function(index, row) {
            $(row).addClass('danger').hide('slow');
        });
    }
};

eventList.prototype.resourceFocused = function(event, parameters) {
    var newDatasetId = '';
    if (parameters.type === 'dataset') {
        newDatasetId = parameters.resource.id;
    } else if (parameters.type === 'event') {
        newDatasetId = parameters.resource.datasetId;
    }

    if (typeof this.datasetId === 'undefined'
            || this.datasetId !== newDatasetId) {
        this.datasetId = newDatasetId;
        sandbox.get('event', {datasetId: this.datasetId}, $.proxy(this.setEvents, this));

    }

};