define(['vendor/jquery', 'vendor/underscore', 'vendor/d3'
], function($, _, d3) {
    function eventTimeline($place, configuration) {
        var graphSvg;
        var graphWidth;
        var graphHeight;
        var xScale;
        var yScale;
        var eventLabels;
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

            graphWidth = $place.width() - 30; // 30 for bootstrap padding
            graphHeight = 200;

            graphSvg = d3.select($place[0])
                    .append('svg')
                    .attr('height', graphHeight)
                    .attr('width', graphWidth)
                    .on('mousemove', mouseMove);
            
            xScale = d3.time.scale()
                    .range([leftPadding, graphWidth])
                    .domain([0, 1]);
            xAxis = d3.svg.axis().scale(xScale);

            graphSvg.append('g')
                    .attr('transform', 'translate(0,120)')
                    .attr('class', 'event-timeline-axis')
                    .call(xAxis);
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

        function toType(y) {
            return _.reduce(yScale, function(memo, minY, type) {
                if (typeof memo !== 'undefined') {
                    return memo;
                } else if (minY <= y && y < minY + markerHeight) {
                    return type;
                }
            }, undefined);
        }

        function highlightRow(y) {
            // Get the event type from y
            var highlightType = toType(y);

            graphSvg.selectAll('.event-timeline-types')
                    .classed('event-timeline-types-highlight', function(type) {
                        return type === highlightType;
                    });

            graphSvg.selectAll('.event-timeline-markers')
                    .classed('event-timeline-markers-highlight', function(event) {
                        return event.type === highlightType;
                    });
        }


        function set(events, startTime, endTime) {
            console.log('Setting. ' + startTime + ', ' + endTime);

            // Sort the events so that it's a nice "cascade"
            events = _.sortBy(events, function(event) {
                return event.startTime;
            });

            // Get all event labels
            eventLabels = _.uniq(_.pluck(events, 'type'));

            yScale = _.reduce(eventLabels, function(memo, label) {
                if (_.has(memo, label) === false) {
                    memo[label] = _.size(memo) * rowHeight;
                }
                return memo;
            }, {});

            // Get rid of events outside the current window
            var viewableEvents = _.reject(events, function(event) {
                return event.endTime < startTime
                        || endTime < event.startTime;
            });

            xScale.domain([startTime, endTime]);
            graphSvg.select('.event-timeline-axis')
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
                        return yScale[event.type];
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
                    .on('click', function(event) {
                        if (typeof configuration.eventClicked === 'function') {
                            configuration.eventClicked(event.id);
                        }
                    })
                    .on('contextmenu', function(event) {
                        var setTo = !d3.select(this).classed('event-timeline-markers-select');
                        d3.select(this).classed('event-timeline-markers-select', setTo);

                        //stop showing browser menu
                        d3.event.preventDefault();
                    });
            svgEvents.exit().remove();



            var svgEventLabels = graphSvg.selectAll('.event-timeline-types')
                    .data(eventLabels, function(label) {
                        return label;
                    });



            svgEventLabels.enter()
                    .append('svg:text')
                    .attr('class', 'event-timeline-types');

            svgEventLabels
                    .attr('x', 0)
                    .attr('y', function(eventLabel) {
                        // Get the CSS font size, remove the "px", and convert
                        // it to an int.
                        var fontSize = parseInt(d3.select(this).style('font-size').slice(0, -2));
                        return yScale[eventLabel] + fontSize;
                    })
                    .text(function(eventLabel) {
                        return eventLabel;
                    })
                    .on('contextmenu', function(type) {
                        console.log('row type: ' + type);

                        //stop showing browser menu
                        d3.event.preventDefault();
                    });

            svgEventLabels.exit().remove();



        }
        
        function getSelected(){
            var idList = [];
            graphSvg.selectAll('.event-timeline-markers-select').each(function(event){
                idList.push(event.id);
            });
            
            return idList;
        }
        
        

        return {
            set: set,
            getSelected: getSelected
        };

    }

    return eventTimeline;
});