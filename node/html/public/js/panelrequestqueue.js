/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


function RequestQueue(parameters, dataset) {
    this.apiUrl = parameters.apiUrl;
    this.dataset = dataset;

    // Get the dataset panel for later requests (or splicing)
    var classInstance = this;
    this.getPanel(this.dataset.startTime, this.dataset.endTime, function(panel) {
        classInstance.dataset.panel = panel;
    });
}


//-----------------------------------------------------------------------------
// Private
//-----------------------------------------------------------------------------

RequestQueue.prototype.getPanel = function(minimumTime, maximumTime, callback) {
    var requestUrl = this.apiUrl + '/dataset/' + this.dataset.id + '/panel/'
            + '?minmax'
            + '&format=json'
            + '&startTime=' + minimumTime
            + '&endTime=' + maximumTime
            + '&buckets=1000';

    $.ajax({
        type: 'GET',
        url: requestUrl,
        dataType: 'json',
        success: $.proxy(function(panel) {
            panel.minimumTime = minimumTime;
            panel.maximumTime = maximumTime;
            console.log("Got panel. Values.length: " + panel.values.length);
            callback(panel);

        }, this)
    });
};

RequestQueue.prototype.trimPanel = function(panel, axes) {

    // Figrue out the indicies of the requested axes.
    var indicies = [];
    var updatedAxes = [];
    updatedAxes.push("time");

    var classInstance = this;
    _.each(axes, function(column_title) {
        var index = $.inArray(column_title, classInstance.dataset.axes);
        if (index !== -1) {
            indicies.push(index + 1); //+1 for time in 0 position of panel
            updatedAxes.push(column_title);
        }
    });



    // Trim the dataset to include only the requested axes.
    // May include reordering the axes!
    var values = [];

    _.each(panel.values, function(row) {
        var newRow = [];

        var time = moment(row[0]).toDate();
        newRow.push(time);
        _.each(indicies, function(index) {
            newRow.push(row[index]);
        });
        values.push(newRow);
    });



    //console.log('panel labels: ' + JSON.stringify(updatedAxes));
    var updatedPanel = {
        labels: updatedAxes,
        values: values,
        minimumTime: panel.minimumTime,
        maximumTime: panel.maximumTime
    };

    return updatedPanel;

};

RequestQueue.prototype.splicePanel = function(panel) {
    return panel;
};


//-----------------------------------------------------------------------------
// Public
//-----------------------------------------------------------------------------

RequestQueue.prototype.requestPanel
        = function(minimumTime, maximumTime, axes, callback, spliced) {
    if (this.dataset.startTime === minimumTime && this.dataset.endTime === maximumTime
            && typeof this.dataset.panel !== "undefined") {
        console.log("Use original panel!");
        var trimmedPanel = this.trimPanel(this.dataset.panel, axes);
        callback(trimmedPanel);
    } else {

        var classInstance = this;
        this.getPanel(minimumTime, maximumTime, function(panel) {
            if (spliced === true) {
                panel = classInstance.splicePanel(panel);
            }
            var trimmedPanel = classInstance.trimPanel(panel, axes);
            callback(trimmedPanel);
        });
    }
};


