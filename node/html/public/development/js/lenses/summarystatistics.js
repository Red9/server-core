function SummaryStatistics(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    this.dataset = {
        headPanel: {
            id: dataset.headPanel.id,
            summaryStatistics: dataset.headPanel.summaryStatistics
        }
    };
    var self = this;

    $('#' + this.id + '_container').load('/lens/summarystatistics?id=' + this.id,
            function() {
                // Do stuff once the lens is loaded.
                var source = $('#summarystatistics-details-template').html();
                self.template = Handlebars.compile(source);

                source = $('#summarystatistics-calculate-template').html();
                self.calculateTemplate = Handlebars.compile(source);

                $.proxy(self.setDisplay('dataset', self.dataset.headPanel.summaryStatistics), self);
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
    var self = this;
    if (typeof reference !== 'undefined') {
        if (reference.type === 'dataset') {
            this.setDisplay('dataset', this.dataset.headPanel.summaryStatistics);
        } else if (reference.type === 'event') {
            $.ajax({
                type: 'GET',
                url: self.parameters.apiDomain + '/event/' + reference.id,
                dataType: 'json',
                success: function(eventList) {
                    if (eventList.length === 1) {
                        self.setDisplay('event', eventList[0].summaryStatistics);
                    }
                }
            });
        }
    } else {

        $('#' + self.id + 'placeholder').html(this.calculateTemplate({}));
        $('#summaryStatisticsCalculateButton').on('click', function() {
            $('#summaryStatisticsCalculateButton').addClass('disabled');
            $.ajax({
                type: 'GET',
                url: self.parameters.apiDomain + '/summarystatistics/' + self.dataset.headPanel.id + '?startTime=' + startTime + '&endTime=' + endTime,
                dataType: 'json',
                success: function(summaryStatistics) {
                    self.setDisplay('custom range', summaryStatistics);
                }
            });
        });
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

