(function(SRLM, $) {
    "use strict";

    /**
     This class provides javascript handling specific  to the example1 page. Most importantly, it provides the dygraphs
     setup and handling, including the handling of mouse-down/up events on the dygraphs range control element.
     
     @class Demo1Page
     @constructor
     */
    SRLM.DynamicGraph = function(configuration) {
        this.$graphCont = configuration.$graphCont;

        this.axes = configuration.axes;
        this.uuid = configuration.uuid;

        //this.graphDataProvider = new JGS.GraphDataProvider();
        //this.graphDataProvider.newGraphDataCallbacks.add($.proxy(this._onNewGraphData, this));

        this.isRangeSelectorActive = false;

    };

    /**
     * Starts everything by requesting initial data load. For example's purposes, initial date extents are hardcoded.
     *
     * @method
     */
    SRLM.DynamicGraph.prototype.init = function() {
        //this.showSpinner(true);

        // Default range dates
        //var rangeEndMom = moment().utc();
        //rangeEndMom.startOf('hour');
        //rangeEndMom.add('hour', 1);
        //var rangeStartMom = moment.utc(rangeEndMom).add('month', -6);

        // Default detail dates
        //var detailEndMom = moment(rangeEndMom);
        //detailEndMom.add('day', -30);
        //var detailStartMom = moment(detailEndMom);
        //detailStartMom.add('day', -120);


        this.loadData(null, null);

        //this.graphDataProvider.loadData("Series-A", rangeStartMom.toDate(), rangeEndMom.toDate(), detailStartMom.toDate(), detailEndMom.toDate(), this.$graphCont.width());

    };

    /**
     * Internal method to add mouse down listener to dygraphs range selector.  Coded so that it can be called
     * multiple times without concern. Although not necessary for simple example (like example1), this becomes necessary
     * for more advanced examples when the graph must be recreated, not just updated.
     *
     * @method _setupRangeMouseHandling
     * @private
     */
    SRLM.DynamicGraph.prototype._setupRangeMouseHandling = function() {
        var self = this;

        // Element used for tracking mouse up events
        this.$mouseUpEventEl = $(window);
        /*if ($.support.cssFloat === false) { //IE<=8, doesn't support mouse events on window
         this.$mouseUpEventEl = $(document.body);
         }*/
        /*
         //Minor Hack...not sure how else to hook-in to dygraphs range selector events without modifying source. This is
         //where minor modification to dygraphs (range selector plugin) might make for a cleaner approach.
         //We only want to install a mouse up handler if mouse down interaction is started on the range control
         var $rangeEl = this.$graphCont.find('.dygraph-rangesel-fgcanvas, .dygraph-rangesel-zoomhandle');
         
         //Uninstall existing handler if already installed
         $rangeEl.off("mousedown.jgs touchstart.jgs");
         
         //Install new mouse down handler
         $rangeEl.on("mousedown.jgs touchstart.jgs", function(evt) {
         
         //Track that mouse is down on range selector
         self.isRangeSelectorActive = true;
         
         // Setup mouse up handler to initiate new data load
         self.$mouseUpEventEl.off("mouseup.jgs touchend.jgs"); //cancel any existing
         $(self.$mouseUpEventEl).on('mouseup.jgs touchend.jgs', function(evt) {
         self.$mouseUpEventEl.off("mouseup.jgs touchend.jgs");
         
         //Mouse no longer down on range selector
         self.isRangeSelectorActive = false;
         
         //Get the new detail window extents
         var graphAxisX = self.graph.xAxisRange();
         self.detailStartDateTm = new Date(graphAxisX[0]);
         self.detailEndDateTm = new Date(graphAxisX[1]);
         
         // Load new detail data
         //self._loadNewDetailData();
         });
         
         });
         
         */
    };

    /**
     * Internal method that provides a hook in to Dygraphs default pan interaction handling.  This is a bit of hack
     * and relies on Dygraphs' internals. Without this, pan interactions (holding SHIFT and dragging graph) do not result
     * in detail data being loaded.
     *
     * @method _setupPanInteractionHandling
     * @private
     */
    SRLM.DynamicGraph.prototype._setupPanInteractionHandling = function() {
        var self = this;

        //Save original endPan function
        var origEndPan = Dygraph.Interaction.endPan;

        //Replace built-in handling with our own function
        Dygraph.Interaction.endPan = function(event, g, context) {

            //Call the original to let it do it's magic
            origEndPan(event, g, context);

            //Extract new start/end from the x-axis

            //Note that this _might_ not work as is in IE8. If not, might require a setTimeout hack that executes these
            //next few lines after a few ms delay. Have not tested with IE8 yet.
            var axisX = g.xAxisRange();
            self.detailStartDateTm = new Date(axisX[0]);
            self.detailEndDateTm = new Date(axisX[1]);

            //Trigger new detail load
            self.loadData(axisX[0], axisX[1]);
        };
        Dygraph.endPan = Dygraph.Interaction.endPan; //see dygraph-interaction-model.js
    };

    /**
     * Callback handler when new graph data is available to be drawn
     *
     * @param graphData
     * @method _onNewGraphData
     * @private
     */

    SRLM.DynamicGraph.prototype.loadData = function(minX, maxX) {
        this.showSpinner(true);


        var request = "/download/raw_data/"
                + this.uuid
                + "?columns=" + this.axes
                + "&buckets=400";

        if (minX !== null) {
            request += "&startTime=";
            request += minX;
        }
        if (maxX !== null) {
            request += "&endTime=";
            request += maxX;
        }


        var self = this;

        $.get(request, function(responseText) {
            self.drawDygraph(responseText);
            self.showSpinner(false);
        });





    };

    /*
     JGS.Demo1Page.prototype._onNewGraphData = function (graphData) {
     this.drawDygraph(graphData);
     this.showSpinner(false);
     
     };*/

    /**
     * Main method for creating or updating dygraph control
     *
     * @param graphData
     * @method drawDygraph
     */
    SRLM.DynamicGraph.prototype.drawDygraph = function(data) {
        //var dyData = graphData.dyData;
        //var detailStartDateTm = graphData.detailStartDateTm;
        //var detailEndDateTm = graphData.detailEndDateTm;

        // This will be needed later when supporting dynamic show/hide of multiple series
        var recreateDygraph = false;

        //Create new graph instance
        if (!this.graph || recreateDygraph) {
            var self = this;
            var onClick = function(ev) {
                console.log("Clicked!");
                if (self.graph.isSeriesLocked()) {
                    self.graph.clearSelection();
                } else {
                    self.graph.setSelection(self.graph.getSelection(), self.graph.getHighlightSeries(), true);
                }
            }


            var drawCallback = function(me, initial) {
                if (blockRedraw || initial) {
                    return;
                }
                blockRedraw = true;
                var range = me.xAxisRange();

                if (document.getElementById('sync_graph_checkbox').checked) {
                    for (var j = 0; j < graphs.length; j++) {
                        if (graphs[j].graph === me) {
                            continue;
                        }
                        //graphs[j].loadData(range['left'], range['right']);

                        graphs[j].graph.updateOptions({
                            dateWindow: range
                        });
                    }
                }
                blockRedraw = false;
            };


            var graphCfg = {
                //axes: axes,
                //labels: labels,

                drawCallback: drawCallback,
                highlightCircleSize: 2,
                strokeWidth: 1,
                strokeBorderWidth: 0,
                highlightSeriesOpts: {
                    strokeWidth: 1,
                    strokeBorderWidth: 0,
                    highlightCircleSize: 5,
                },
                customBars: true,
                //showRangeSelector: true,
                interactionModel: Dygraph.Interaction.defaultModel,
                connectSeparatedPoints: true,
                zoomCallback: $.proxy(this._onDyZoomCallback, this),
                digitsAfterDecimal: 2,
                labelsDivWidth: "275",
                clickCallback: onClick
            };
            this.graph = new Dygraph(this.$graphCont.get(0), data, graphCfg);

            this._setupRangeMouseHandling();
            //this._setupPanInteractionHandling();

        }
        //Update existing graph instance
        else {
            var graphCfg = {
                //axes: axes,
                //labels: labels,
                file: data,
                //dateWindow: [detailStartDateTm.getTime(), detailEndDateTm.getTime()]
            };
            this.graph.updateOptions(graphCfg);
        }

    };

    /**
     * Dygraphs zoom callback handler
     *
     * @method _onDyZoomCallback
     * @private
     */
    SRLM.DynamicGraph.prototype._onDyZoomCallback = function(minDate, maxDate, yRanges) {
        console.log("_onDyZoomCallback");

        console.log("minDate: ", minDate);
        console.log("maxDate: ", maxDate);



        if (this.graph === null)
            return;

        //this.detailStartDateTm = new Date(minDate);
        //this.detailEndDateTm = new Date(maxDate);
        var minX = minDate;
        var maxX = maxDate;


        //When zoom reset via double-click, there is no mouse-up event in chrome (maybe a bug?),
        //so we initiate data load directly
        if (this.graph.isZoomed('x') === false) {
            this.$mouseUpEventEl.off("mouseup.jgs touchend.jgs"); //Cancel current event handler if any
            this.loadData(null, null);
            return;
        }

        //Check if need to do IE8 workaround
        /*if ($.support.cssFloat == false) { //IE<=8
         // ie8 calls drawCallback with new dates before zoom. This example currently does not implement the
         // drawCallback, so this example might not work in IE8 currently. This next line _might_ solve, but will
         // result in duplicate loading when drawCallback is added back in.
         this._loadNewDetailData();
         return;
         }*/

        //The zoom callback is called when zooming via mouse drag on graph area, as well as when
        //dragging the range selector bars. We only want to initiate dataload when mouse-drag zooming. The mouse
        //up handler takes care of loading data when dragging range selector bars.
        var doDataLoad = !this.isRangeSelectorActive;
        if (doDataLoad === true) {
            this.loadData(minX, maxX);
        }

    };

    /**
     * Helper method for showing/hiding spin indicator. Uses spin.js, but this method could just as easily
     * use a simple "data is loading..." div.
     *
     * @method showSpinner
     */
    SRLM.DynamicGraph.prototype.showSpinner = function(show) {
        if (show === true) {
            console.log("Show spinner");
            if (this.spinner == null) {
                var opts = {
                    lines: 13, // The number of lines to draw
                    length: 7, // The length of each line
                    width: 6, // The line thickness
                    radius: 10, // The radius of the inner circle
                    corners: 1, // Corner roundness (0..1)
                    rotate: 0, // The rotation offset
                    color: '#000', // #rgb or #rrggbb
                    speed: 1, // Rounds per second
                    trail: 60, // Afterglow percentage
                    shadow: false, // Whether to render a shadow
                    hwaccel: false, // Whether to use hardware acceleration
                    className: 'spinner', // The CSS class to assign to the spinner
                    zIndex: 2e9, // The z-index (defaults to 2000000000)
                    top: 'auto', // Top position relative to parent in px
                    left: 'auto' // Left position relative to parent in px
                };
                var target = this.$graphCont.parent().get(0);
                this.spinner = new Spinner(opts);
                this.spinner.spin(target);
                this.spinnerIsSpinning = true;
            } else {
                if (this.spinnerIsSpinning === false) { //else already spinning
                    this.spinner.spin(this.$graphCont.get(0));
                    this.spinnerIsSpinning = true;
                }
            }
        } else if (this.spinner != null && show === false) {
            console.log("Stop spinner");
            this.spinner.stop();
            this.spinnerIsSpinning = false;
        }

    };

}(window.SRLM = window.SRLM || {}, jQuery));




