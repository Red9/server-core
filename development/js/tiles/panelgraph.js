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
            }
        };

        this.graph = new Dygraph(graphDiv[0], [[0, 0]], graphCfg);
        //this._setupPanInteractionHandling();
        //this.graph.dynamicDygraphInstance = this;
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