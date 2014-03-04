

function LensTemplate(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    var classInstance = this;

    $('#' + this.id + '_container').load('/lens/LENS_TYPE?id=' + this.id,
            function() {
                // Do stuff once the lens is loaded.
            });
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------


// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------


LensTemplate.prototype.setRange = function(startTime, endTime) {

};

LensTemplate.prototype.setHover = function(time) {

};

LensTemplate.prototype.setMarkers = function(markerATime, markerBTime) {

};

LensTemplate.prototype.setPlaytime = function(time) {

};

LensTemplate.prototype.getConfiguration = function() {

};

