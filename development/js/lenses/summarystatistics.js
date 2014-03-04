function SummaryStatistics(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    var classInstance = this;

    $('#' + this.id + '_container').load('/lens/summarystatistics?id=' + this.id,
            function() {
                // Do stuff once the lens is loaded.


                var source = $('#summarystatistics-details-template').html();
                var template = Handlebars.compile(source);


                var context = {summaryStatistics: dataset.summaryStatistics};

                //console.log(JSON.stringify(context));

                var html = template(context);

                $('#' + classInstance.id + 'placeholder').html(html);
            });
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------


SummaryStatistics.prototype.setRange = function(startTime, endTime) {

};

SummaryStatistics.prototype.setHover = function(time) {

};

SummaryStatistics.prototype.setMarkers = function(markerATime, markerBTime) {

};

SummaryStatistics.prototype.setPlaytime = function(time) {

};

SummaryStatistics.prototype.getConfiguration = function() {

};

