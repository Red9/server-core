function Graph(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;
    this.dataset = {// Explicitly keep only what we need (for memory savings)
        startTime: dataset.startTime,
        endTime: dataset.endTime,
        id: dataset.id
    };
    this.configuration = configuration;
    this.prepareConfiguration();

    this.window_start_time = this.dataset.startTime;
    this.window_end_time = this.dataset.endTime;

    var classInstance = this;

    $('#' + classInstance.id + '_container').load(
            '/lens/graph?id=' + classInstance.id,
            function() {
                classInstance.prepareListeners();

                classInstance.createInitialPlaceholder(classInstance.configuration.axes);

                classInstance.siteSpinLoader = new SiteSpinLoader(classInstance.id + "graph");
                classInstance.parameters.requestPanelFunction(
                        classInstance.dataset.startTime,
                        classInstance.dataset.endTime,
                        classInstance.configuration.axes,
                        $.proxy(classInstance.updateWithNewPanel, classInstance));

            }
    );

}



//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------
Graph.prototype.createInitialPlaceholder = function(axes) {
    var fakeData = [];
    var fakeRowData = [];

    _.each(this.configuration.axes, function() {
        fakeRowData.push([0, 0, 0]);
    });
    fakeRowData.unshift(new Date(this.dataset.startTime));
    fakeData.push(fakeRowData);
    fakeRowData.shift();
    fakeRowData.unshift(new Date(this.dataset.endTime));
    fakeData.push(fakeRowData);

    // Make a deep copy so that we don't modify the original axes.
    var tempAxes = ['time'];
    _.each(axes, function(axis) {
        tempAxes.push(axis);
    });

    // Make empty graph (works as a placeholder during loading).
    this.drawDygraph(fakeData, tempAxes);

};

/**
 * 
 * @returns {String} Takes the columns and converts it to a CSV string.
 */
Graph.prototype.getCSVColumns = function() {
    var result = "";
    _.each(this.configuration.axes, function(axis, index) {
        if (index !== 0) {
            result += ",";
        }
        result += axis;
    });

    return result;
};

Graph.prototype.prepareListeners = function() {
    var classInstance = this;
    $('#' + this.id + 'clip_to_img_button').click(function() {
        var requestURL = Dygraph.Export.asCanvas(classInstance.graph).toDataURL();
        $('#' + classInstance.id + 'clip_to_img_button').attr("href", requestURL);
    });

    $('#' + this.id + 'clip_to_download_button').click(function() {
        var request_url = classInstance.parameters.apiDomain
                + '/dataset/' + classInstance.dataset.id
                + '/panel?axes=' + classInstance.getCSVColumns()
                + '&startTime=' + classInstance.window_start_time
                + '&endTime=' + classInstance.window_end_time;
        $('#' + classInstance.id + 'clip_to_download_button').attr("href", request_url);
    });

    $('#' + this.id + 'clip_to_custom_download_button').click(function() {
        var request_url = '/dataset/' + classInstance.dataset.id
                + '/download?axes=' + classInstance.getCSVColumns()
                + '&startTime=' + classInstance.window_start_time
                + '&endTime=' + classInstance.window_end_time;
        $('#' + classInstance.id + 'clip_to_custom_download_button').attr("href", request_url);
    });

    $('#' + this.id + 'clip_to_event_button').click(function() {
        var request_url = '/snippet/createeventmodal'
                + '?startTime=' + classInstance.window_start_time
                + '&endTime=' + classInstance.window_end_time
                + '&dataset=' + classInstance.dataset.id;

        // Is this repeat safe? Every time this button is clicked then
        // the modal is reloaded. Is this ok?
        $("#create_event_modal").load(request_url, function() {
            $("#new_event_modal").modal('show');
        });
    });
};

Graph.prototype.prepareConfiguration = function() {
    if (typeof this.configuration === 'undefined') {
        this.configuration = {};
    }

    if (typeof this.configuration.axes === 'undefined') {
        this.configuration.axes = [
            'acceleration:x',
            'acceleration:y',
            'acceleration:z'
        ];
    }
};


Graph.prototype.drawDygraph = function(data, labels, startTime, endTime) {
    if (!this.graph) {
        var classInstance = this;
        var onClick = function(ev) {
            if (classInstance.graph.isSeriesLocked()) {
                classInstance.graph.clearSelection();
            } else {
                classInstance.graph.setSelection(classInstance.graph.getSelection(), classInstance.graph.getHighlightSeries(), true);
            }
        };

        var DygraphTimeFormatter = function(date) {
            return moment(date).format("H:mm:ss.SSS");
        };

        var FormatLabels = function(labels) {
            // If a label has a colon :, include only the postfix.
            var result = [];
            result.push(labels[0]); //Time
            for (var i = 1; i < labels.length; i++) {// 1 for time
                if (labels[i].split(":").length === 2) {
                    result.push(labels[i].split(":")[1]);
                } else {
                    result.push(labels[i]);
                }
            }
            return result;
        };

        var DygraphAxisLabelFormatter = function(d, gran) {
            console.log("typeof d: " + typeof d);
            console.log("gran: " + gran);
            console.log("typeof gran: " + gran);
            return moment(d).format("mm:ss");

            //return Dygraph.dateAxisFormatter(new Date(d.getTime() + 7200 * 1000), gran);
        };


        var graphCfg = {
            xlabel: "time",
            labels: FormatLabels(labels),
            highlightCircleSize: 2,
            strokeWidth: 1,
            strokeBorderWidth: 0,
            highlightSeriesOpts: {
                strokeWidth: 1,
                strokeBorderWidth: 0,
                highlightCircleSize: 5
            },
            customBars: true,
            interactionModel: Dygraph.Interaction.defaultModel,
            connectSeparatedPoints: true,
            zoomCallback: $.proxy(this.onZoom, this),
            digitsAfterDecimal: 2,
            labelsDivWidth: "300",
            clickCallback: onClick,
            xAxisLabelWidth: 100,
            axisLabelWidth: 100,
            axes: {
                x: {
                    valueFormatter: DygraphTimeFormatter
                            //axisLabelFormatter: DygraphAxisLabelFormatter
                }
            }
        };

        this.graph = new Dygraph(document.getElementById(this.id + "graph"), data, graphCfg);
        //this._setupPanInteractionHandling();
        //this.graph.dynamicDygraphInstance = this;

    }
    //Update existing graph instance
    else {
        console.log("Update existing graph..(" + data.length + " items )");

        var graphCfg = {
            file: data,
            dateWindow: [startTime, endTime]// {left: minX, right: maxX}
        };

        this.graph.updateOptions(graphCfg);


    }

    this.setTitle();

};


Graph.prototype.setTitle = function() {
    var title = 'Default Title';
    if (typeof this.configuration.title !== 'undefined') {
        title = this.configuration.title;
    } else if (this.configuration.axes.length > 0) {
        var types = [];
        _.each(this.configuration.axes, function(axis) {
            types.push(axis.split(':')[0]);
        });

        types = _.uniq(types, false);

        _.each(types, function(type, i) {
            if (i === 0) {// first
                title = type;
            } else if (i === types.length - 1) { // last
                title = title + " and " + type;
            } else { //  Not first or last, so at least 3
                title = title + ", " + type;
            }
        });
    }

    $('#' + this.id + 'title').text(title);
};

Graph.prototype.onZoom = function(startTime, endTime) {
    // Dygraphs has this annoying feature of decimals...
    startTime = Math.round(startTime);
    endTime = Math.round(endTime);
    if (this.graph === null) {
        return;
    }

    // Just to make sure no little +- 0.0000001 bits get in there...
    if (this.graph.isZoomed('x') === false) {
        startTime = this.dataset.startTime;
        endTime = this.dataset.endTime;
    }

    this.window_start_time = startTime;
    this.window_end_time = endTime;

    this.setRange(startTime, endTime);
    this.parameters.updateRangeFunction(this.id, startTime, endTime);
};


Graph.prototype.updateWithNewPanel = function(panel) {
    this.drawDygraph(panel.values, panel.labels, panel.startTime, panel.endTime);
    if (typeof this.siteSpinLoader !== 'undefined') {
        this.siteSpinLoader.stop();
        delete this.siteSpinLoader;
    }
};



//------------------------------------------------------------------------------
// Public
//------------------------------------------------------------------------------
Graph.prototype.setRange = function(startTime, endTime) {
    // Go ahead and zoom while loading to at least give the user something to look at.
    if (typeof this.graph !== "undefined") {
        this.graph.updateOptions({
            dateWindow: [startTime, endTime]// {left: minX, right: maxX}
        });
    }

    if (typeof this.siteSpinLoader === 'undefined') {
        this.siteSpinLoader = new SiteSpinLoader(this.id + "graph");
    }

    this.parameters.requestPanelFunction(
            startTime, endTime,
            this.configuration.axes,
            $.proxy(this.updateWithNewPanel, this),
            true);
};
