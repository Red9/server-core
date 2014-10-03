define(['vendor/jquery', 'vendor/underscore', 'vendor/d3'
], function($, _, d3) {
    function eventTimeline($place, configuration) {
        var graphSvg;
        var graphWidth = $place.width() - 30; // 30 for bootstrap padding
        var graphHeight = 200; // Make an initial guess.
        var xScaleHeight = 20;
        var xScale;
        var yScale;
        var xAxis;

        // Constants
        var markerHeight = 10;
        var rowPadding = 4;
        var leftPadding = 60;
        var minimumMarkerWidth = 4;
        var rowHeight = markerHeight + rowPadding;

        initialize();




        function initialize() {
            // Create a SVG in $place

            graphSvg = d3.select($place[0])
                    .append('svg')
                    .attr('height', graphHeight)
                    .attr('width', graphWidth)
                    .on('mousemove', mouseMove)
                    .on('mouseout', mouseOut)
                    .on('contextmenu', emptyRightClick)
                    .on('drag', dragmove);

            xScale = d3.time.scale()
                    .range([leftPadding, graphWidth])
                    .domain([0, 1]);
            xAxis = d3.svg.axis().scale(xScale);

            var xScaleY = (graphHeight - xScaleHeight);
            graphSvg.append('g')
                    .attr('transform', 'translate(0,' + xScaleY + ')')
                    .attr('class', 'event-timeline-axis')
                    .call(xAxis);

            graphSvg.append('svg:line')
                    .attr('x1', 200)
                    .attr('y1', 0)
                    .attr('x2', 200)
                    .attr('y2', 10)
                    .attr('class', 'hovermarker inactive');

            graphSvg.append('svg:line')
                    .attr('x1', 200)
                    .attr('y1', 0)
                    .attr('x2', 200)
                    .attr('y2', 10)
                    .attr('class', 'videomarker inactive');

        }

        function dragmove(d) {
            console.log('d3.event.x: ' + d3.event.x);
        }

        function setHoverMarker(time) {
            var x = xScale(time);
            graphSvg.selectAll('.hovermarker')
                    .attr('x1', x)
                    .attr('x2', x)
                    .classed('active', true)
                    .classed('inactive', false);


        }
        function clearHoverMarker() {
            graphSvg.selectAll('.hovermarker')
                    .classed('active', false)
                    .classed('inactive', true);
        }

        function setVideoMarker(time) {
            var x = xScale(time);
            graphSvg.selectAll('.videomarker')
                    .attr('x1', x)
                    .attr('x2', x)
                    .classed('active', true)
                    .classed('inactive', false);


        }
        function clearVideoMarker() {
            graphSvg.selectAll('.videomarker')
                    .classed('active', false)
                    .classed('inactive', true);
        }


        function emptyRightClick() {
            //stop showing browser menu
            d3.event.preventDefault();

            if (typeof configuration.emptyRightClick === 'function') {
                configuration.emptyRightClick();
            }
        }

        function mouseOut() {
            highlightRow(-1);
        }

        function mouseMove() {
            highlightRow(d3.mouse(this)[1]);

            if (typeof configuration.hoverTime === 'function') {
                var x = d3.mouse(this)[0];
                if (x >= leftPadding) {
                    configuration.hoverTime(Math.floor(
                            xScale.invert(x)));
                }
            }
        }

        function toRowKey(y) {
            return _.reduce(yScale, function(memo, minY, rowKey) {
                if (typeof memo !== 'undefined') {
                    return memo;
                } else if (minY <= y && y < minY + markerHeight) {
                    return rowKey;
                }
            }, undefined);
        }

        function highlightRow(y) {
            // Get the event type from y
            var rowKey = toRowKey(y);

            graphSvg.selectAll('.event-timeline-types')
                    .classed('event-timeline-types-highlight', function(type) {
                        return type === rowKey;
                    });

            graphSvg.selectAll('.event-timeline-markers')
                    .classed('event-timeline-markers-highlight', function(event) {
                        return calculateRowKey(event) === rowKey;
                    });
        }

        function calculateRowKey(event) {
            return event.type + event.source.type;
        }

        function set(events, startTime, endTime) {
            // Get all event labels
            var eventLabels = {};
            var rowKeys = [];
            _.each(events, function(event) {
                var key = calculateRowKey(event);
                eventLabels[key] = event.type
                        + (event.source.type === 'auto' ? '*' : '');
                rowKeys.push(key);
            });

            rowKeys = _.uniq(rowKeys).sort();

            yScale = {};
            _.each(rowKeys, function(key, index) {
                yScale[key] = index * rowHeight;
            });

            // Get rid of events outside the current window
            var viewableEvents = _.reject(events, function(event) {
                return event.endTime < startTime
                        || endTime < event.startTime;
            });

            xScale.domain([startTime, endTime]);

            var xScaleY = rowKeys.length * rowHeight;
            graphHeight = xScaleY + xScaleHeight;
            graphSvg.attr('height', graphHeight);

            graphSvg.selectAll('.hovermarker')
                    .attr('y2', xScaleY);
            graphSvg.selectAll('.videomarker')
                    .attr('y2', xScaleY);


            graphSvg.select('.event-timeline-axis')
                    .attr('transform', 'translate(0,' + xScaleY + ')')
                    .call(xAxis);

            var svgEvents = graphSvg.selectAll('.event-timeline-markers')
                    .data(viewableEvents, function(event) {
                        return event.id;
                    });

            svgEvents.enter()
                    .append('svg:rect')
                    .attr('class', 'event-timeline-markers');

            svgEvents
                    .attr('y', function(event) {
                        return yScale[calculateRowKey(event)];
                    })
                    .attr('height', markerHeight)
                    .each(function(event) {
                        var x = xScale(event.startTime);
                        var xEnd = xScale(event.endTime);


                        if ((x > graphWidth && xEnd > graphWidth)
                                || (x < leftPadding && xEnd < leftPadding)) {
                            // Do nothing. Off edge of graph.
                            return;
                        }

                        if (xEnd > graphWidth) { // End of event off right edge.
                            xEnd = graphWidth;
                        }

                        if (x < leftPadding) { // Start of event off left edge
                            x = leftPadding;
                        }

                        if (x > xEnd) {
                            console.log('Error: x > xEnd...: ' + x + ', ' + xEnd);
                        }

                        var eWidth = xEnd - x;
                        eWidth = eWidth >= minimumMarkerWidth ? eWidth : minimumMarkerWidth;

                        d3.select(this).attr({
                            x: x,
                            width: eWidth
                        });
                    })
                    .classed('event-timeline-markers-source-auto', function(event) {
                        return event.source.type === 'auto';
                    })
                    .on('click', function(event) {
                        if (typeof configuration.eventClicked === 'function') {
                            configuration.eventClicked(event.id);
                        }
                    })
                    .on('contextmenu', function(event) {
                        var setTo = !d3.select(this).classed('event-timeline-markers-select');
                        d3.select(this).classed('event-timeline-markers-select', setTo);

                        d3.event.stopPropagation();

                        //stop showing browser menu
                        d3.event.preventDefault();
                    });

            svgEvents.exit().remove();



            var svgEventLabels = graphSvg.selectAll('.event-timeline-types')
                    .data(rowKeys, function(label) {
                        return label;
                    });



            svgEventLabels.enter()
                    .append('svg:text')
                    .attr('class', 'event-timeline-types');

            svgEventLabels
                    .attr('x', 0)
                    .attr('y', function(rowKey) {
                        // Get the CSS font size, remove the "px", and convert
                        // it to an int.
                        var fontSize = parseInt(d3.select(this).style('font-size').slice(0, -2));
                        return yScale[rowKey] + fontSize;
                    })
                    .text(function(rowKey) {
                        return eventLabels[rowKey];
                    })
                    .on('contextmenu', function(rowKey) {
                        console.log('row type: ' + rowKey);

                        //stop showing browser menu
                        d3.event.preventDefault();
                    })
                    .on('click', function(rowKey) {
                        graphSvg.selectAll('.event-timeline-markers')
                                .each(function(event) {
                                    if (calculateRowKey(event) === rowKey) {
                                        d3.select(this).classed('event-timeline-markers-select', true);
                                    }
                                });
                    });

            svgEventLabels.exit().remove();
        }

        function getSelected() {
            var idList = [];
            graphSvg.selectAll('.event-timeline-markers-select').each(function(event) {
                idList.push(event.id);
            });

            return idList;
        }

        function clearSelected() {
            graphSvg.selectAll('.event-timeline-markers-select')
                    .classed('event-timeline-markers-select', false);
        }

        return {
            set: set,
            getSelected: getSelected,
            clearSelected: clearSelected,
            setHoverMarker: setHoverMarker,
            clearHoverMarker: clearHoverMarker,
            setVideoMarker: setVideoMarker,
            clearVideoMarker: clearVideoMarker
        };
    }

    return eventTimeline;
});