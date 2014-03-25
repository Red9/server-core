function eventList(myPlace, configuration, doneCallback) {

    this.myPlace = myPlace;
    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));
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
        self.myPlace.find('input').bind('click', function(event) {
            console.log('Checkbox clicked. Row Name: ' + $(this).closest('tr').attr('name'));
        });

        // Listen for clicks on an event in table
        self.myPlace.find('tr td:nth-child(n+2)').bind('click', function(event) {
            var id = $(this).closest('tr').attr('name');
            sandbox.resourceFocused('event', id);
        });
    });
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