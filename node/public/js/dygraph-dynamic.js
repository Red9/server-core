// The dynamic dygraph stuff was inspired by:
// http://kaliatech.github.io/dygraphs-dynamiczooming-example/example1.html

(function(SRLM, $) {
    "use strict";

    SRLM.DynamicGraph = function(configuration) {
        this.$graphCont = configuration.$graphCont;

        this.axes = configuration.axes;
        this.uuid = configuration.uuid;
        this.buckets = configuration.buckets;

        this.initial_start_time = configuration.start_time;
        this.initial_end_time = configuration.end_time;
        this.spinner = new SRLM.EasySpinner(this.$graphCont.parent());

        this.AddToRequestQueue = configuration.AddToRequestQueue;

        this.LoadDataMap = configuration.LoadDataMap;
        this.syncCheckboxId = configuration.syncCheckboxId;

        this.loadData(this.initial_start_time, this.initial_end_time);
    };


    /** Take two datasets, one high resolution over a short peiod,  and one low 
     * resolution over a longer period. Now merge them together, throwing away
     * any low resolution data that is covered by the high resolution data.
     * 
     * This is useful for being able to pan: you'll be able to see where you're
     * panning to.
     * 
     * @param {type} new_data
     * @return {splicedResult}
     */
    SRLM.DynamicGraph.prototype.spliceData = function(new_data) {
        var splicedResult = [];

        var detailed_start = new_data[0][0];
        var detailed_end = new_data[new_data.length - 1][0];

        var i = 0;
        // Load the low resolution data before the splice
        while (this.initialData[i][0] < detailed_start) {
            splicedResult.push(this.initialData[i]);
            i++;
        }

        // Load the high resolution data
        for (var j = 0; j < new_data.length; j++) {
            splicedResult.push(new_data[j]);
        }

        // Load the remaining low resolution data (but only if it's not in the high resoultion range.
        for (; i < this.initialData.length; i++) {
            if (this.initialData[i][0] > detailed_end) {
                splicedResult.push(this.initialData[i]);
            }
        }

        return splicedResult;
    };


    /** Load data from the server, based on the minimum and maximum time.
     * 
     * @param {type} minX min time.
     * @param {type} maxX max time.
     */
    SRLM.DynamicGraph.prototype.loadData = function(minX, maxX) {
        this.spinner.showSpinner(true);

        // Go ahead and zoom while loading to at least give the user something to look at.
        if (typeof this.graph !== "undefined") {
            this.graph.updateOptions({
                dateWindow: [minX, maxX]// {left: minX, right: maxX}
            });
        }

        // Is this the first data that we loaded, and we're back? If so then
        // Joy of Joys! We've saved it. Let's display that instead of loading it
        // again.
        if (Math.round(minX) === Math.round(this.initial_start_time)
                && maxX === Math.round(this.initial_end_time)
                && typeof this.initialData !== "undefined") {
            this.drawDygraph(this.initialData, this.initialLabels);
            this.spinner.showSpinner(false);
        } else { // else we need to load some data.
            var request = "/api/dataset/"
                    + this.uuid
                    + "?columns=" + this.axes
                    + "&buckets=" + this.buckets
                    + "&resulttype=json";

            if (minX !== null) {
                request += "&startTime=" + minX;
            }
            if (maxX !== null) {
                request += "&endTime=" + maxX;
            }

            var self = this; // Need a self for a reference to the graph in the nested function.

            var callback = function(response) {
                var data = response.values;

                // Convert the parts of the response to Date and Float values.
                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < data[i].length; j++) {
                        if (j === 0) { // parse as time axis
                            data[i][j] = new Date(parseFloat(data[i][j]));
                        } else if (data[i][j] instanceof Array) { // parse as min;avg;max
                            for (var k = 0; k < data[i][j].length; k++) {
                                data[i][j][k] = parseFloat(data[i][j][k]);
                            }
                        } else { // parse as single value
                            data[i][j] = parseFloat(data[i][j]);
                        }
                    }
                }

                if (typeof self.initialData === "undefined") {
                    // First time! Save for later. Optimization.
                    self.initialData = data;
                    self.initialLabels = response.labels;
                } else {
                    // We don't want to splice the first time, but all other zooms.
                    data = self.spliceData(data);
                }

                self.drawDygraph(data, response.labels);
                self.spinner.showSpinner(false);
            };

            this.AddToRequestQueue({request: request, callback: callback, identifier: this.axes});
        }

    };

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
     * @method _setupPanInteractionHandling
     * @private
     */
    SRLM.DynamicGraph.prototype._setupPanInteractionHandling = function() {

        if (SRLM.DynamicGraph.isGlobalPanInteractionHandlerInstalled) {
            return;
        } else {
            SRLM.DynamicGraph.isGlobalPanInteractionHandlerInstalled = true;
        }

        //Save original endPan function
        var origEndPan = Dygraph.Interaction.endPan;

        //Replace built-in handling with our own function
        Dygraph.Interaction.endPan = function(event, g, context) {

            var myInstance = g.dynamicDygraphInstance;

            //Call the original to let it do it's magic
            origEndPan(event, g, context);

            var axisX = g.xAxisRange();

            myInstance.loadDataToGraphs(axisX[0], axisX[1]);
        };
        Dygraph.endPan = Dygraph.Interaction.endPan; //see dygraph-interaction-model.js
    };



    /** This will load the data to this graph. If the user has enabled synchronization,
     * then it will update all the other graphs (and the map) as well.
     * 
     * @param {type} minX
     * @param {type} maxX
     */
    SRLM.DynamicGraph.prototype.loadDataToGraphs = function(minX, maxX) {
        this.loadData(minX, maxX);

        if (document.getElementById(this.syncCheckboxId).checked) {
            this.LoadDataMap(minX, maxX);
            for (var j = 0; j < graphs.length; j++) {
                if (graphs[j] === this) {
                    continue;
                } else {
                    graphs[j].loadData(minX, maxX);
                }
            }
        }
    };


    /** Main method to actually draw the dygraph.
     * 
     * @param {type} data
     * @param {type} labels
     * @return {unresolved}
     */
    SRLM.DynamicGraph.prototype.drawDygraph = function(data, labels) {
        //Create new graph instance
        if (!this.graph) {
            var self = this;
            var onClick = function(ev) {
                if (self.graph.isSeriesLocked()) {
                    self.graph.clearSelection();
                } else {
                    self.graph.setSelection(self.graph.getSelection(), self.graph.getHighlightSeries(), true);
                }
            };

            var DygraphTimeFormatter = function(date) {
                return DateTimeFormatter.Format(date) + '<br>';
            };

            var graphCfg = {
                xlabel: "time",
                labels: labels,
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
                zoomCallback: $.proxy(this._onDyZoomCallback, this),
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

            this.graph = new Dygraph(this.$graphCont.get(0), data, graphCfg);
            this._setupPanInteractionHandling();
            this.graph.dynamicDygraphInstance = this;

        }
        //Update existing graph instance
        else {
            var graphCfg = {
                file: data,
            };
            this.graph.updateOptions(graphCfg);
        }

    };

    /** Get the actual dygraph object.
     * 
     * @return {Dygraph}
     */
    SRLM.DynamicGraph.prototype.getGraph = function() {
        return this.graph;
    };

    /**
     * 
     * @param {type} minDate
     * @param {type} maxDate
     * @return {unresolved}
     */
    SRLM.DynamicGraph.prototype._onDyZoomCallback = function(minDate, maxDate) {
        if (this.graph === null) {
            return;
        }

        var minX = minDate;
        var maxX = maxDate;

        if (this.graph.isZoomed('x') === false) {
            minX = this.initial_start_time;
            maxX = this.initial_end_time;
        }

        this.loadDataToGraphs(minX, maxX);
    };

}(window.SRLM = window.SRLM || {}, jQuery));




