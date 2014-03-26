function panelGraph(myPlace, configuration, doneCallback) {
    var self = this;
    self.myPlace = myPlace;
    self.configuration = configuration;
    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));

    if (typeof self.configuration === 'undefined') {
        self.configuration = {};
    }

    if (typeof self.configuration.axes === 'undefined') {
        self.configuration.axes = [
            'acceleration:x',
            'acceleration:y',
            'acceleration:z'
        ];
    }



    sandbox.requestTemplate('panelgraph', function(template) {
        myPlace.html(template({}));

        self.setTitle();
        self.constructDygraph(myPlace.find('.row div div'));

        myPlace.find('div h2 span a').on('click', function() {
            myPlace.children('.modal').modal('show');
        });


        self.prepareListeners();

        doneCallback();
    });



}

panelGraph.prototype.prepareListeners = function() {
    var self = this;
    var exportModalBody = this.myPlace.find('.modal-body');

    var defaultButton = '<a class="btn btn-default btn-block"></a>';
    exportModalBody.append(
            $(defaultButton)
            .attr('download', 'graph-image.png')
            .text('PNG')
            .on('click', function() {
                console.log('PNG download clicked');
                var imageUrl = Dygraph.Export.asCanvas(self.graph).toDataURL();
                console.log('Image url: ' + imageUrl);
                $(event.target).attr("href",
                        imageUrl);
            })
            );

    exportModalBody.append(
            $(defaultButton)
            .text('New Event')
            .on('click', function() {

                var range = self.graph.xAxisRange();
                var startTime = range[0];
                var endTime = range[1];

                var request_url = '/snippet/createeventmodal'
                        + '?startTime=' + startTime
                        + '&endTime=' + endTime
                        + '&dataset=' + self.datasetId;

                // Is this repeat safe? Every time this button is clicked then
                // the modal is reloaded. Is this ok?
                self.myPlace.find('.modal').modal('hide');
                $("#create_event_modal").load(request_url, function() {
                    $("#new_event_modal").modal('show');
                });


            })
            );


};

panelGraph.prototype.setTitle = function() {
    var title = 'Default Title';
    if (typeof this.configuration.title !== 'undefined') {
        title = this.configuration.title;
    } else if (this.configuration.axes.length === 1) {
        var brokenAxis = this.configuration.axes[0].split(':');
        title = brokenAxis[0] + ' ' + brokenAxis[1];
    } else if (this.configuration.axes.length > 1) {
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

    this.myPlace.find('.rowtitle').text(title);
};


//------------------------------------------------------------------------------
// Private
//------------------------------------------------------------------------------
panelGraph.prototype.createInitialPlaceholder = function(axes) {
    var fakeData = [];
    var fakeRowData = [];

    _.each(this.configuration.axes, function() {
        fakeRowData.push([0, 0, 0]);
    });
    fakeRowData.unshift(new Date(this.dataset.headPanel.startTime));
    fakeData.push(fakeRowData);
    fakeRowData.shift();
    fakeRowData.unshift(new Date(this.dataset.headPanel.endTime));
    fakeData.push(fakeRowData);

    // Make a deep copy so that we don't modify the original axes.
    var tempAxes = ['time'];
    _.each(axes, function(axis) {
        tempAxes.push(axis);
    });

    // Make empty graph (works as a placeholder during loading).
    this.drawDygraph(fakeData, tempAxes);

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

panelGraph.prototype.setupGraphPanHandling = function() {
    /**
     * Internal method that provides a hook in to Dygraphs default pan interaction handling.  This is a bit of hack
     * and relies on Dygraphs' internals. Without this, pan interactions (holding SHIFT and dragging graph) do not result
     * in detail data being loaded.
     *
     * This method works by replacing the global Dygraph.Interaction.endPan method.  The replacement method
     * is global to all instances of this class, and so it can not rely on "self" scope.  To support muliple graphs
     * with their own pan interactions, we keep a circular reference to this object instance on the dygraphs instance
     * itself when creating it. This allows us to look up the correct page object instance when the endPan callback is
     * triggered. We use a global JGS.Demo3Page.isGlobalPanInteractionHandlerInstalled flag to make sure we only install
     * the global handler once.
     *
     * Taken from a dygraphs example:
     * https://github.com/kaliatech/dygraphs-dynamiczooming-example/blob/master/j/JGS.Demo3Page.js
     *
     * @method _setupPanInteractionHandling
     * @private
     */

    // Make sure we don't setup multiple times
    if (this.isGlobalPanInteractionHandlerInstalled) {
        return;
    } else {
        this.isGlobalPanInteractionHandlerInstalled = true;
    }
    var self = this;

    //Save original endPan function
    var origEndPan = Dygraph.Interaction.endPan;

    //Replace built-in handling with our own function
    Dygraph.Interaction.endPan = function(event, g, context) {

        var myInstance = g.dynamicDygraphInstance;

        //Call the original to let it do it's magic
        origEndPan(event, g, context);

        var axisX = g.xAxisRange();

        self.onZoom(axisX[0], axisX[1]);
    };
    Dygraph.endPan = Dygraph.Interaction.endPan; //see dygraph-interaction-model.js
};

panelGraph.prototype.createEventRegion = function(canvas, area, dygraph, index, event) {
    var min_data_x = dygraph.getValue(0, 0);
    var max_data_x = dygraph.getValue(dygraph.numRows() - 1, 0);

    var startTimeX = dygraph.toDomXCoord(event.startTime);
    var endTimeX = dygraph.toDomXCoord(event.endTime);

    var fontHeight = 14;
    var fontPadding = 4;

    var style = '';

    if (index % 2 === 0) {
        style = 'rgba(80,70,190,1.0)';
    } else {
        style = 'rgba(190,25,80,1.0)';
    }
    canvas.fillStyle = style;
    canvas.strokeStyle = style;

    // Draw rectangle to span event time
    //canvas.fillRect(startTimeX, area.y + area.h - (fontHeight + fontPadding), endTimeX - startTimeX, fontHeight + fontPadding);
    
    // Draw background canvas
    canvas.fillStyle = 'rgba(255,255,255,0.8';
    canvas.fillRect(startTimeX, area.y + area.h - (fontHeight + fontPadding), canvas.measureText(event.type).width, fontHeight);
    
    
    // Draw line tickers
    canvas.lineWidth = 3;
    
    canvas.beginPath();
    canvas.moveTo(startTimeX, area.y + area.h - fontHeight);
    canvas.lineTo(startTimeX, area.y + area.h - fontHeight*2);
    canvas.lineTo(startTimeX, area.y + area.h - fontHeight*3/2);
    canvas.lineTo(startTimeX + fontHeight / 2, area.y + area.h - fontHeight*3/2);
    canvas.stroke();

    canvas.beginPath();
    canvas.moveTo(endTimeX, area.y + area.h - fontHeight);
    canvas.lineTo(endTimeX, area.y + area.h - fontHeight*2);
    canvas.lineTo(endTimeX, area.y + area.h - fontHeight*3/2);
    canvas.lineTo(endTimeX - fontHeight / 2, area.y + area.h - fontHeight*3/2);
    canvas.stroke();
    
    // Draw label
    canvas.font = fontHeight + 'px Arial';
    canvas.fillStyle = 'rgba(0,0,0,1.0)';
    canvas.fillText(event.type, startTimeX + 2, area.y + area.h - fontPadding);
};

panelGraph.prototype.underlayCallback = function(canvas, area, dygraph) {
    var self = this;
    sandbox.get('event', {datasetId: this.datasetId}, function(events) {
        var sortedEvents = _.sortBy(events, function(event) {
            return event.startTime;
        });

        _.each(sortedEvents, function(event, index) {
            self.createEventRegion(canvas, area, dygraph, index, event);
        });
    });
};

panelGraph.prototype.constructDygraph = function(graphDiv) {
    if (typeof this.graph === 'undefined') {
        var self = this;
        var onClick = function(ev) {
            if (self.graph.isSeriesLocked()) {
                self.graph.clearSelection();
            } else {
                self.graph.setSelection(self.graph.getSelection(), self.graph.getHighlightSeries(), true);
            }
        };

        var graphCfg = {
            xlabel: "time",
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
                }
            },
            underlayCallback: $.proxy(this.underlayCallback, this)
        };

        this.graph = new Dygraph(graphDiv[0], [[0, 0]], graphCfg);
        this.setupGraphPanHandling();
    }
};

panelGraph.prototype.onZoom = function(startTime, endTime) {
    sandbox.resourceFocused('dataset', this.datasetId, Math.round(startTime), Math.round(endTime));
};

//Update existing graph instance
panelGraph.prototype.updateDygraph = function(panel) {
    if (typeof this.graph !== 'undefined') {

        var graphCfg = {
            file: panel.values,
            labels: FormatLabels(panel.labels),
            dateWindow: [panel.startTime, panel.endTime]
        };

        this.graph.updateOptions(graphCfg);

    }
};

panelGraph.prototype.resourceFocused = function(event, parameter) {
    if (typeof parameter.panel !== 'undefined') {
        if (parameter.type === 'dataset') {
            this.datasetId = parameter.resource.id;
        } else if (parameter.type === 'event') {
            this.datasetId = parameter.resource.datasetId;
        }

        this.updateDygraph(sandbox.trimPanel(parameter.panel, this.configuration.axes));
    }
};