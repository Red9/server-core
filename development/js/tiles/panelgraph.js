define(['vendor/jquery', 'vendor/underscore', 'vendor/moment',
    'vendor/rickshaw', 'vendor/d3'
], function($, _, moment, Rickshaw, d3) {
    function panelGraph(sandbox, tile, configuration, doneCallback) {
        var graph;
        var rangeSelector;
        var graphData = [];
        var marker;

        tile.addListener('totalState-resource-focused', resourceFocused);
        tile.addListener('totalState-video-time', videoTime);

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

        tile.setTitle(sandbox.createHumanAxesString(configuration.axes));

        sandbox.requestTemplate('panelgraph', function(template) {
            tile.place.html(template({}));
            doneCallback();
        });

        function drawEvents(eventAxisPlace, xScale, width, height) {
            eventAxisPlace.empty();
            var svg = d3.select(eventAxisPlace[0]).append('svg')
                    .attr('width', width)
                    .attr('height', height);

            sandbox.get('event', {datasetId: sandbox.focusState.dataset},
            function(events) {
                var sortedEvents = _.sortBy(events, function(event) {
                    return event.startTime;
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
                            
                            if(x > xEnd){
                                console.log('Error: x > xEnd...: ' + x + ', ' + xEnd);
                            }

                            var eWidth = xEnd - x;

                            d3.select(this).attr({
                                x: x,
                                width: eWidth
                            });

                        })

                        .style('fill', function(event, index) {

                            var fills = [
                                '#fc8d59',
                                '#91bfdb',
                                '#91bfdb',
                                '#fc8d59'
                            ];
                            
                            /*var fills = [
                                '#BF4930', // Red
                                '#1D7471', // Teal
                                '#1D7471',
                                '#BF4930'
                            ];*/
                            
                            return fills[index % 4];
                        })
                        .attr('height', height/2);

                svgEvents.append('svg:text')
                        .attr('x', function(event) {
                            return xScale(event.startTime) + 2;
                        })
                        .attr('y', function(event, index) {
                            return index % 2 ? (height/2) - 2 : height - 2;
                        })
                        .attr('font-size', '10px')
                        .attr('fill', '#ffffbf')
                        .text(function(event) {
                            return event.type;
                        });

            });
        }

        function resourceFocused(event, parameter) {
            console.log('Resource focused...');
            if (typeof parameter.panel !== 'undefined') {
                console.log('Got panel. ' + parameter.panel.panel.time.length);
                while (graphData.length > 0) {
                    graphData.pop();
                }
                _.each(parameter.panel.panel, function(values, columnName) {

                    if (_.indexOf(configuration.axes, columnName) !== -1) {
                        var data = [];
                        _.each(values, function(value, index) {
                            data.push({
                                x: parameter.panel.panel.time[index],
                                y: value
                            });

                        });
                        graphData.push({
                            data: data,
                            color: sandbox.definedColorMappings[columnName],
                            name: columnName.split(':')[1],
                            strokeWidth: 1
                        });
                    }
                });
            }
            var graphArea = tile.place.find('[data-name=grapharea]');
            graphArea[0].setAttribute("style",
                    "margin-right:0px");

            var yAxisPlace = tile.place.find('.rickshaw_red9_y_axis');
            var xAxisPlace = tile.place.find('.rickshaw_red9_x_axis');
            var eventAxisPlace = tile.place.find('.rickshaw_red9_event_axis');

            var graphWidth = graphArea.parent().parent().width()
                    - yAxisPlace.width();

            var graphHeight = graphArea.parent().parent().height()
                    - xAxisPlace.height() - eventAxisPlace.height();

            var xAxisWidth = graphWidth;// + yAxisPlace.width() - 10;

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
                    onShow: function(x,y){
                        //console.log('hover: ' + x + ', ' + y);
                        sandbox.initiateHoverTimeEvent(x);
                    },
                    onHide: function(){
                        console.log('Not hovering...');
                    }
                });
                
                marker = new Rickshaw.Graph.Marker({
                   graph:graph 
                });
                
                

                rangeSelector = new Rickshaw.Graph.RangeSelector({
                    graph: graph,
                    onZoom: function(e) {
                        var startTime = Math.floor(e.position.xMin);
                        var endTime = Math.floor(e.position.xMax);
                        console.log('Zoom!: ' + startTime + ', ' + endTime);
                        sandbox.resourceFocused('dataset', sandbox.focusState.dataset, startTime, endTime);

                    },
                    onZoomOut: function() {
                        console.log('onZoom out');
                        sandbox.resourceFocused('dataset', sandbox.focusState.dataset);
                    }
                });

            }

            var panelStartTime = parameter.panel.panel.time[0];
            var panelEndTime = parameter.panel.panel.time[parameter.panel.panel.time.length - 1];
            //console.log('Zoom to: ' + panelStartTime + ', ' + panelEndTime);
            //rangeSelector.zoomTo(panelStartTime, panelEndTime, false);

            graph.render();

            var xAxisScale = d3.scale.linear()
                    .range([0, xAxisWidth])
                    .domain([panelStartTime, panelEndTime]);
            drawEvents(eventAxisPlace, xAxisScale, xAxisWidth, eventAxisPlace.height())
        }

        function videoTime(event, parameter) {
            marker.setTime(parameter.videoTime);
        }

    }

    return panelGraph;
});