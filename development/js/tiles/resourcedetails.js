function resourceDetails(myPlace, configuration, doneCallback) {
    this.myPlace = myPlace;
    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));

    this.setResource('dataset', {});

    doneCallback();
}

resourceDetails.prototype.setResource = function(type, resource) {

    var details = {
        apiUrl: sandbox.apiUrl
    };

    var self = this;
    if (type === 'dataset') {
        sandbox.requestTemplate('datasetdetails', function(template) {
            details.dataset = resource;
            self.myPlace.html(template(details));
            self.myPlace.find('[data-name=commentsDiv]').commentList(resource.id, type);
        });
    }
};

resourceDetails.prototype.resourceFocused = function(event, parameters) {
    if (parameters.type === 'dataset') {
        this.setResource('dataset', parameters.resource);
    } else if (parameters.type === 'event') {
        // TODO(SRLM): Check to make sure that the event is still in the same
        // dataset. If it's not then we probably need to remove the details or 
        // update them. This could be an issue for when we allow changing events
        // and go to a "new page".

    }
};