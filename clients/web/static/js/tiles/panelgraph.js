define(['vendor/jquery', 'vendor/underscore', 'vendor/moment',
    'vendor/rickshaw', 'vendor/d3'
], function($, _, moment, Rickshaw, d3) {
    function panelGraph(sandbox, tile, configuration, doneCallback) {
        var kMinimumZoomDuration = 100;
        
        var graph;
        var rangeSelector;
        var graphData;
        var videoMarker;
        var hoverMarker;

        function init() {
            graphData = [];
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-video-time', videoTime);
            tile.addListener('totalState-hover-time', hoverTime);

            if (typeof configuration === 'undefined') {
                configuration = {};
            }

            if (typeof configuration.axes === 'undefined') {
                configuration.axes = [
                    'acceleration:x',
                    'acceleration:y',
                    'acceleration:z'
                ];
            }

            if (typeof configuration.showMarkers === 'undefined') {
                configuration.showMarkers = true;
            }

            updateTitle();

            sandbox.requestTemplate('panelgraph', function(template) {
                tile.place.html(template({}));
                tile.addToBar('settings', '', 'glyphicon-cog', toggleSettings);
                doneCallback();
            });
        }

        function updateTitle() {
            tile.setTitle(sandbox.createHumanAxesString(configuration.axes));
        }

        function toggleSettings() {
            tile.place.find('[data-name=settings]').toggleClass('hidden');
        }

        function populateSettings() {

            var selectableAxes = _.map(
                    _.omit(sandbox.focusState.panel.panel, 'time'),
                    function(data, axis) {
                        return{
                            axis: axis,
                            checked: _.indexOf(configuration.axes, axis) !== -1
                                    ? 'checked' : ''
                        };
                    });


            var displayableAxes = _.reduce(selectableAxes, function(memo, value, index, list) {
                var calculatedIndex = Math.floor(index / Math.ceil(list.length / memo.length));
                memo[calculatedIndex].push(value);
                return memo;
            }, [[], [], [], []]);

            sandbox.requestTemplate('panelgraph.settings', function(settingsTemplate) {
                var settingsOptions = {
                    axes: displayableAxes
                };
                if (configuration.showMarkers === true) {
                    settingsOptions.showMarkersChecked = true;
                }
                var html = $(settingsTemplate(settingsOptions));
                html.find('[data-name=axis-checkbox]').on('click', function() {
                    var axis = $(this).attr('name');
                    console.log('axis: ' + axis);
                    toggleAxis(axis);

                });
                html.find('[data-name=showmarkerscheckbox]').on('click', function() {

                    configuration.showMarkers = this.checked;
                    if (this.checked === false) {
                        videoMarker.hide();
                        hoverMarker.hide();
                    }
                });

                tile.place.find('[data-name=settings]').html(html);
            });
        }

        function toggleAxis(newAxis) {
            var index = _.indexOf(configuration.axes, newAxis);
            if (index === -1 && _.has(sandbox.focusState.panel.panel, newAxis)) {
                configuration.axes.push(newAxis);
                addGraphDataAxis(newAxis);
                graph.render();
            } else if (index !== -1) {
                configuration.axes.splice(index, 1);

                var graphDataIndex = -1;
                _.each(graphData, function(data, index) {
                    if (data.axis === newAxis) {
                        graphDataIndex = index;
                    }
                });
                if (graphDataIndex !== -1) {
                    graphData.splice(graphDataIndex, 1);
                    graph.render();
                }
            }
            updateTitle();
        }

        function addGraphDataAxis(axis) {
            var panel = sandbox.focusState.panel.panel;

            if (_.has(panel, axis) === true) {
                var data = [];
                _.each(panel[axis], function(axisValue, index) {
                    data.push({
                        x: panel.time[index],
                        y: axisValue
                    });

                });
                graphData.push({
                    axis: axis,
                    data: data,
                    color: sandbox.colorMap(axis),
                    name: axis.split(':')[1],
                    strokeWidth: 1
                });
            }
        }

        function clearGraphData() {
            while (graphData.length > 0) {
                graphData.pop();
            }
        }

        function resourceFocused(event, parameter) {
            if (typeof parameter.panel !== 'undefined') {
                populateSettings();

                clearGraphData();
                _.each(configuration.axes, function(axis) {
                    addGraphDataAxis(axis);
                });
            }
            var graphArea = tile.place.find('[data-name=grapharea]');
            graphArea[0].setAttribute("style", "margin-right:0px");

            var yAxisPlace = tile.place.find('.rickshaw_red9_y_axis');

            var graphWidth = graphArea.parent().parent().width()
                    - yAxisPlace.width() - 30; // 30: bootstrap padding

            var graphHeight = graphArea.parent().parent().height();

            if (typeof graph === 'undefined') {
                //var graphArea = graphArea[0];
                graph = new Rickshaw.Graph({
                    element: graphArea[0],
                    width: graphWidth,
                    height: graphHeight,
                    renderer: 'line',
                    stack: false,
                    min: 'auto',
                    preserve: true,
                    stroke: true,
                    series: graphData
                });

                var xAxis = new Rickshaw.Graph.Axis.Time({
                    graph: graph,
                    orientation: 'bottom',
                    timeFixture: (new Rickshaw.Fixtures.Time.Millisecond()),
                });


                var yAxis = new Rickshaw.Graph.Axis.Y({
                    graph: graph,
                    orientation: 'left',
                    element: yAxisPlace[0]
                });

                var hoverDetail = new Rickshaw.Graph.HoverDetail({
                    graph: graph,
                    xFormatter: function(x) {
                        return new Date(x).toUTCString();
                    },
                    onShow: function(x, y) {
                        sandbox.initiateHoverTimeEvent(x);
                    },
                    onHide: function() {
                        //console.log'Not hovering...');
                    }
                });

                videoMarker = new Rickshaw.Graph.Marker({
                    graph: graph
                });
                videoMarker.hide();

                hoverMarker = new Rickshaw.Graph.Marker({
                    graph: graph
                });
                hoverMarker.hide();

                rangeSelector = new Rickshaw.Graph.RangeSelector({
                    graph: graph,
                    onZoom: function(e) {
                        var startTime = Math.floor(e.position.xMin);
                        var endTime = Math.floor(e.position.xMax);
                        if (_.isNaN(startTime) === false
                                && _.isNaN(endTime) === false
                                && endTime - startTime > kMinimumZoomDuration) {
                            sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDatasetId(), startTime, endTime);
                        }

                    },
                    onZoomOut: function() {
                        sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDatasetId());
                    }
                });

            }

            var panelStartTime = parameter.panel.panel.time[0];
            var panelEndTime = parameter.panel.panel.time
                    [parameter.panel.panel.time.length - 1];

            graph.render();
        }

        function videoTime(event, parameter) {
            if (configuration.showMarkers === true) {
                videoMarker.show();
                videoMarker.setX(parameter.videoTime);
            } else {
                videoMarker.hide();
            }
        }

        function hoverTime(event, parameter) {
            if (configuration.showMarkers === true) {
                hoverMarker.show();
                hoverMarker.setX(parameter.hoverTime);
            } else {
                hoverMarker.hide();
            }
        }

        function destructor() {
            clearGraphData();
            graph.render();

            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = graph
                    = rangeSelector
                    = graphData
                    = videoMarker
                    = hoverMarker
                    = null;
        }

        init();
        return {
            destructor: destructor
        };

    }

    return panelGraph;
});