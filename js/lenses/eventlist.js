

function EventList(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;
    this.events = [];

    var classInstance = this;

    $('#' + this.id + '_container').load('/lens/eventlist?id=' + this.id,
            function() {
                $.ajax({
                    type: 'GET',
                    url: classInstance.parameters.apiDomain + '/event/?dataset=' + dataset['id'],
                    dataType: 'json',
                    success: $.proxy(classInstance.SetEvents, classInstance)
                });
            });
}

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------

EventList.prototype.SetEvents = function(events) {
    this.events = events;

    this.table = $('#' + this.id + '_eventlist_table').dataTable(this.createDatatable(events));

    var oTable = this.table;
    var classInstance = this;

    // Listen for buttons, first
    $('#' + this.id + '_eventlist_table button').click(function(clickEvent) {
        var cellDom = $(this).closest('td')[0];
        var rowDom = $(this).closest('tr')[0];
        var position = oTable.fnGetPosition(cellDom);
        var rowIndex = position[0];
        var visibleColumnIndex = position[1];
        var allColumnIndex = position[2];
        var rowData = oTable.fnGetData(rowIndex);

        if (allColumnIndex === classInstance.index.delete) {
            clickEvent.stopImmediatePropagation();
            var template = Handlebars.compile($("#eventlist-delete-are-you-sure").html());

            var deleteButtonId = classInstance.id + classInstance.events[rowIndex].id + "delete";
            
            var context = {
                id: deleteButtonId
            };

            oTable.fnOpen(rowDom, template(context), "danger");
            
            $('#' + deleteButtonId).click(function() {
                $.ajax({
                    type: 'POST',
                    url: classInstance.parameters.apiDomain + '/event/' + classInstance.events[rowIndex].id + '/delete',
                    datatype: 'json',
                    success: function(data) {
                        console.log("Event Deleted");
                        oTable.fnClose(rowDom);
                        $(rowDom).addClass('danger');
                        $(rowDom).hide('slow', function(){
                            oTable.fnDeleteRow(rowDom);
                        });
             
                    },
                    error: function(data) {
                        alert("Something went wrong with the delete!");
                    }
                });
            });



        } else if (allColumnIndex === classInstance.index.view) {
            clickEvent.stopImmediatePropagation();
            classInstance.parameters.updateRangeFunction(
                    rowData[classInstance.index.start_time],
                    rowData[classInstance.index.end_time]
                    );

        } else {
            console.log("Some different button clicked...");


        }


        //console.log("Cell clicked: " + position); 
        //var data = oTable.fnGetData(position);
        //console.log("Data: " + JSON.stringify(data));
    });

    $('#' + this.id + '_eventlist_table').delegate('tr', 'click', function(event) {
        var rowIndex = oTable.fnGetPosition(this);

        if (rowIndex !== null) {
            // Get JSON representation of row in table
            var rowData = oTable.fnGetData(rowIndex);

            if (oTable.fnIsOpen(this)) {
                oTable.fnClose(this);
            } else {
                var template = Handlebars.compile($("#eventlist-details-template").html());

                oTable.fnOpen(this, template(classInstance.events[rowIndex]));
            }

            //

        }

    });
};


EventList.prototype.createDatatable = function(events) {
    var classInstance = this;
    var eventTable = [];
    _.each(events, function(event, index, list) {
        var cells = [];

        var pathLength = -1;
        try {
            pathLength = event.summary_statistics.static.route.path.distance.value;
        } catch (e) {
        }

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

        cells.push('<button class="btn btn-block"><span class="glyphicon glyphicon-eye-open"></span></button>');
        cells.push('<button class="btn btn-block"><span class="glyphicon glyphicon-remove"></span></button>');

        cells.push(event.id);

        eventTable.push(cells);
    });

    var columns = [
        {sTitle: 'Type'}, // Type
        {sTitle: 'Time', iDataSort: 2}, // Time
        {bVisible: false}, // Start Time
        {bVisible: false}, // End Time

        {sTitle: 'Duration', iDataSort: 5}, // Duration (string)
        {bVisible: false}, // Duration
        {sTitle: 'Path Length'}, // Path Length

        {sTitle: '', bSortable: false}, // View Event Icon
        {sTitle: '', bSortable: false}, // Delete Event Icon

        {bVisible: false}                   // Event ID
    ];

    classInstance.index = {};

    classInstance.index.start_time = 2;
    classInstance.index.end_time = 3;
    classInstance.index.view = 7;
    classInstance.index.delete = 8;
    classInstance.index.id = 9;



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

