function SummaryStatistics(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    this.dataset = {
        summaryStatistics: dataset.summaryStatistics
    };
    var self = this;

    $('#' + this.id + '_container').load('/lens/summarystatistics?id=' + this.id,
            function() {
                // Do stuff once the lens is loaded.
                var source = $('#summarystatistics-details-template').html();
                self.template = Handlebars.compile(source);
                
                $.proxy(self.setDisplay('dataset', self.dataset.summaryStatistics), self);
            });
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------

SummaryStatistics.prototype.setDisplay = function(type, summaryStatistics) {
    var context = {type: type, summaryStatistics: summaryStatistics};
    var html = this.template(context);
    $('#' + this.id + 'placeholder').html(html);
};


// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------


SummaryStatistics.prototype.setRange = function(startTime, endTime, reference) {
    if (typeof reference !== 'undefined') {
        if (reference.type === 'dataset') {
            this.setDisplay('dataset', this.dataset.summaryStatistics);
        } else if (reference.type === 'event') {
            this.setDisplay('event', {});
        }
    }

};

SummaryStatistics.prototype.setHover = function(time) {

};

SummaryStatistics.prototype.setMarkers = function(markerATime, markerBTime) {

};

SummaryStatistics.prototype.setPlaytime = function(time) {

};

SummaryStatistics.prototype.getConfiguration = function() {

};

