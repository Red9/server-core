

function EventList(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    var eventlist = this;

    $('#' + this.id + '_container').load('/lens/eventlist?id=' + this.id,
            function() {
                $.ajax({
                    type: 'GET',
                    url: apiUrl + '/event/?dataset=' + dataset['id'],
                    dataType: 'json',
                    success: $.proxy(eventlist.SetEvents, eventlist)
                });
            });
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------

EventList.prototype.SetEvents = function(events) {

    this.table = $('#' + this.id + '_eventlist_table').dataTable(this.createDatatable(events));

    var oTable = this.table;
    var eventlist = this;
    $('#' + this.id + '_eventlist_table').delegate('tr', 'click', function(event) {
        var aPos = oTable.fnGetPosition(this);
        if (aPos !== null) {
            // Get JSON representation of row in table
            var aData = oTable.fnGetData(aPos);
            
            eventlist.parameters.updateRangeFunction(aData[2], aData[3]);

        }

    });
};


EventList.prototype.createDatatable = function(events) {
    var eventTable = [];
    _.each(events, function(event, index, list) {
        var cells = [];
        var pathLength = event['summary_statistics']['static']['route']['path']['distance']['value'];
        var start = moment(event['start_time']);
        var end = moment(event['end_time']);
        var duration = moment.duration(event['end_time'] - event['start_time']);

        cells.push(event['type']);
        cells.push(start.format("h:mm:ss.SSS"));
        cells.push(start.valueOf());
        cells.push(end.valueOf());

        cells.push(duration.humanize());
        cells.push(duration.asMilliseconds());
        cells.push(pathLength.toFixed(2));



        eventTable.push(cells);
    });

    var columns = [
        {sTitle: 'Type'},
        {sTitle: 'Time', iDataSort: 2},
        {bVisible: false},
        {bVisible: false},
        {sTitle: 'Duration', iDataSort: 5},
        {bVisible: false},
        {sTitle: 'Path Length'}
    ];

    var result = {
        aaData: eventTable,
        aoColumns: columns
    };

    //console.log("eventTable: " + JSON.stringify(eventTable));
    //console.log("columns: " + JSON.stringify(columns));

    return result;
};



// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------


EventList.prototype.setRange = function(minimumTime, maximumTime) {

};

EventList.prototype.setHover = function(time) {

};

EventList.prototype.setMarkers = function(markerATime, markerBTime) {

};

EventList.prototype.setPlaytime = function(time) {

};

EventList.prototype.getConfiguration = function() {

};

