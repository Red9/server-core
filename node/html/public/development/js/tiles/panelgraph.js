define(['vendor/jquery', 'vendor/underscore', 'vendor/moment',
    'vendor/rickshaw', 'vendor/d3'
], function($, _, moment, Rickshaw, d3) {
    function panelGraph(sandbox, tile, configuration, doneCallback) {
        var graph;
        var rangeSelector;
        var graphData = [];
        var videoMarker;
        var hoverMarker;

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

        function drawEvents(eventAxisPlace, xScale, width, height) {
            eventAxisPlace.empty();
            var svg = d3.select(eventAxisPlace[0]).append('svg')
                    .attr('width', width)
                    .attr('height', height);

            var datasetId = sandbox.getCurrentDataset();
            sandbox.get('event', {datasetId: datasetId},
            function(events) {
                var sortedEvents = _.filter(_.sortBy(events, function(event) {
                    return event.startTime;
                }), function(event) {
                    return event.type.toLowerCase() !== 'default'
                            && event.type.toLowerCase() !== 'sync';
                });

                function eventClickHandler(event) {
                    console.log('clicked: ' + event.type);
                    sandbox.resourceFocused('event', event.id);
                }

                function mouseoverHandler(event) {
                    //console.log('Mousing over ' + event.type);
                }

                function mouseoutHandler(event) {
                    //console.log('Mousing out  ' + event.type);
                }

                var svgEvents = svg.selectAll('.rickshaw_red9_event')
                        .data(sortedEvents).enter().append('g')
                        .on('click', eventClickHandler)
                        .on('mouseover', mouseoverHandler)
                        .on('mouseout', mouseoutHandler);

                svgEvents.append('svg:rect')
                        .attr('y', function(event, index) {
                            return index % 2 ? 0 : 10;
                        })
                        .each(function(event) {
                            var x = xScale(event.startTime);
                            var xEnd = xScale(event.endTime);


                            if ((x > width && xEnd > width)
                                    || (x < 0 && xEnd < 0)) {
                                // Do nothing. Off edge of graph.
                                return;
                            }

                            if (xEnd > width) { // End of event off right edge.
                                xEnd = width;
                            }

                            if (x < 0) { // Start of event off left edge
                                x = 0;
                            }

                            if (x > xEnd) {
                                console.log('Error: x > xEnd...: ' + x + ', ' + xEnd);
                            }

                            var eWidth = xEnd - x;

                            d3.select(this).attr({
                                x: x,
                                width: eWidth
                            });

                        })

                        .style('fill', function(event, index) {

                            var strokes = [
                                '#377eb8',
                                '#4daf4a',
                                '#4daf4a',
                                '#377eb8'
                            ];
                            return strokes[index % 4];
                        })
                        .style('fill-opacity', '0.5')
                        //.style('stroke-opacity', '0.5')
                        //.style('stroke-width', '2')
                        .attr('height', height / 2);

                svgEvents.append('svg:text')
                        .attr('x', function(event) {
                            return xScale(event.startTime) + 2;
                        })
                        .attr('y', function(event, index) {
                            return index % 2 ? (height / 2) - 2 : height - 2;
                        })
                        .attr('font-size', '10px')
                        .attr('fill', '#000000')
                        .text(function(event) {
                            return event.type;
                        });

            });
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
            var xAxisPlace = tile.place.find('.rickshaw_red9_x_axis');
            var eventAxisPlace = tile.place.find('.rickshaw_red9_event_axis');

            var graphWidth = graphArea.parent().parent().width()
                    - yAxisPlace.width() - 30; // 30: bootstrap padding

            var graphHeight = graphArea.parent().parent().height()
                    - xAxisPlace.height() - eventAxisPlace.height();

            var xAxisWidth = graphWidth + yAxisPlace.width();

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

                var xAxis = new Rickshaw.Graph.Axis.X({
                    graph: graph,
                    orientation: 'bottom',
                    tickFormat: function(x) {
                        return moment(x).format('m:ss.SSS');
                    },
                    element: xAxisPlace[0]
                });
                // This is a bit of a hack. I have no idea why the x Axis got so
                // big, but we need to trim it down.
                xAxisPlace.find('svg').attr('width', xAxisWidth);

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
                        sandbox.resourceFocused('dataset', sandbox.getCurrentDataset(), startTime, endTime);

                    },
                    onZoomOut: function() {
                        sandbox.resourceFocused('dataset', sandbox.getCurrentDataset());
                    }
                });

            }

            var panelStartTime = parameter.panel.panel.time[0];
            var panelEndTime = parameter.panel.panel.time
                    [parameter.panel.panel.time.length - 1];

            graph.render();

            var xAxisScale = d3.scale.linear()
                    .range([0, xAxisWidth])
                    .domain([panelStartTime, panelEndTime]);
            drawEvents(eventAxisPlace, xAxisScale, xAxisWidth, eventAxisPlace.height());
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

            tile.destructor();

            $
                    = _
                    = moment
                    = Rickshaw
                    = d3
                    = sandbox
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

        return {
            destructor: destructor
        };

    }

    return panelGraph;
});