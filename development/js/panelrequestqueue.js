function RequestQueue(parameters, dataset) {
    this.apiUrl = parameters.apiUrl;

    this.dataset = {// Explicitly keep only what we need (for memory savings)
        startTime: dataset.headPanel.startTime,
        endTime: dataset.headPanel.endTime,
        headPanelId: dataset.headPanel.id,
        id: dataset.id,
        axes: dataset.headPanel.axes

    };

    this.queue = async.queue($.proxy(this.handleRequest, this), 1);

    // Get the dataset panel for later requests (or splicing)
    this.queue.push({
        startTime: this.dataset.startTime,
        endTime: this.dataset.endTime,
        axes: this.dataset.axes,
        callback: function() {
        }
    });
}
//-----------------------------------------------------------------------------
// Private
//-----------------------------------------------------------------------------

RequestQueue.prototype.processPanel = function(request, panel, doneCallback) {
    panel.startTime = request.startTime;
    panel.endTime = request.endTime;

    var classInstance = this;
    if (request.spliced === true) {
        panel = classInstance.splicePanel(panel);
    }
    panel = classInstance.trimPanel(panel, request.axes);

    request.callback(panel);
    doneCallback();

};

RequestQueue.prototype.handleRequest = function(request, doneCallback) {

    console.log('Handling request. this.dataset.panel ' + typeof this.dataset.panel);
    if (typeof this.dataset.panel !== 'undefined'
            && request.startTime === this.dataset.panel.startTime
            && request.endTime === this.dataset.panel.endTime) {
        this.processPanel(request, this.dataset.panel, doneCallback);
    } else if (typeof this.lastPanel !== 'undefined'
            && request.startTime === this.lastPanel.startTime
            && request.endTime === this.lastPanel.endTime) {
        this.processPanel(request, this.lastPanel, doneCallback);
    } else {

        var requestUrl = this.apiUrl + '/panel/' + this.dataset.headPanelId + '/body/'
                + '?minmax'
                + '&format=json'
                + '&startTime=' + request.startTime
                + '&endTime=' + request.endTime
                + '\&buckets=1000';
        console.log('Request url: ' + requestUrl);

        $.ajax({
            type: 'GET',
            url: requestUrl,
            dataType: 'json',
            success: $.proxy(function(panel) {
                this.lastPanel = panel;
                if (typeof this.dataset.panel === 'undefined') {
                    this.dataset.panel = panel;
                }
                this.processPanel(request, panel, doneCallback);
            }, this)
        });
    }
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
        startTime: panel.startTime,
        endTime: panel.endTime
    };

    return updatedPanel;

};

/** 
 * @todo(srlm): There's some corner cases here that aren't accounted for...
 * @param {type} panel
 * @returns {RequestQueue.prototype.splicePanel.panel}
 */
RequestQueue.prototype.splicePanel = function(panel) {
    var classPanelValues = this.dataset.panel.values;
    var localPanelValues = panel.values;
    var resultPanelValues = [];

    var i;

    // Add the dataset first "half"
    for (i = 0; i < classPanelValues.length
            && classPanelValues[i][0] < localPanelValues[0][0]
            ; i = i + 1) {
        resultPanelValues.push(classPanelValues[i]);
    }

    // Add in the splice
    _.each(localPanelValues, function(value, index) {
        resultPanelValues.push(value);
    });

    // Find the end of the splice
    for (; i < classPanelValues.length
            && classPanelValues[i][0] <= localPanelValues[localPanelValues.length - 1][0]
            ; i = i + 1) {
    }
    
    // Finish the dataset second "half"
    for (; i < classPanelValues.length; i = i + 1) {
        resultPanelValues.push(classPanelValues[i]);
    }

    panel.values = resultPanelValues;
    
    return panel;
};


//-----------------------------------------------------------------------------
// Public
//-----------------------------------------------------------------------------

RequestQueue.prototype.requestPanel
        = function(startTime, endTime, axes, callback, spliced) {
            var request = {
                startTime: startTime,
                endTime: endTime,
                axes: axes,
                callback: callback,
                spliced: spliced
            };
            this.queue.push(request);
        };


