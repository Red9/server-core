define(['vendor/jquery', 'vendor/underscore', 'vendor/d3'], function($, _, d3) {

    function panelSpectralEntropy(sandbox, tile, configuration, doneCallback) {

        function init() {
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

            if (typeof configuration.height === 'undefined') {
                configuration.height = 90;
            }
            setPlace();

            tile.setTitle(sandbox.createHumanAxesString(configuration.axes) + ' spectral distribution');
            tile.addListener('totalState-resource-focused', resourceFocused);
            doneCallback();

        }

        function setPlace() {
            sandbox.requestTemplate('panelspectralentropy', function(template) {
                tile.place.html(template(
                        {
                            // 18 === x axis height, + 8 is extra?
                            height: 'height: ' + (configuration.axes.length * configuration.height + 26) + 'px;',
                            axes: configuration.axes
                        }
                ));
            });
        }

        function createHeatmap(svg, xAxisSvg, yAxisSvg, data) {

            if (data.length === 0) {
                return;
            }

            // Need to convert the height/width from 123px to 123 (string to int)
            var width = svg.style('width');
            var height = svg.style('height');
            width = parseInt(width.substring(0, width.length - 2));
            height = parseInt(height.substring(0, height.length - 2));




            var minX = 9007199254740992;
            var maxX = -9007199254740992;
            var minY = 9007199254740992;
            var maxY = -9007199254740992;
            var minZ = 9007199254740992;
            var maxZ = -9007199254740992;
            var x, y, z;


            var xCount = 0;
            var previousX = -9007199254740992;
            for (var i = 0; i < data.length; i++) {
                x = data[i][0];
                if (x !== previousX) {
                    xCount++;
                    previousX = x;
                }
                if (x < minX) {
                    minX = x;
                }
                if (x > maxX) {
                    maxX = x;
                }

                y = data[i][1];
                if (y < minY) {
                    minY = y;
                }
                if (y > maxY) {
                    maxY = y;
                }

                z = data[i][2];
                if (z < minZ) {
                    minZ = z;
                }
                if (z > maxZ) {
                    maxZ = z;
                }
            }

            x = d3.scale.linear()
                    .range([0, width])
                    .domain([minX, maxX]);

            y = d3.scale.linear()
                    .range([height, 0]) // reverse so that 0 is at the bottom
                    .domain([minY, maxY]);

            z = d3.scale.log().domain([minZ, maxZ]);
            z.domain([0, 0.5, 1].map(z.invert));
            z.range(["green", "yellow", "red"]);


            //height of each row in the heatmap
            //width of each column in the heatmap

            var yCount = data.length / xCount;
            var w = width / xCount;
            var h = (height / yCount) + 1;

            console.log('width: ' + width + ', xCount: ' + xCount);

            var timeIndex = 0;
            var previousTime = data[0][0]; // TODO: One of the [0]'s is erroring for Mica, on a full dataset.

            var heatMap = svg.selectAll(".heatmap")
                    .data(data)
                    .enter().append("svg:rect")
                    .attr('shape-rendering', 'crispEdges')
                    .attr("x", function(d, i) {
                        if (previousTime !== d[0]) {
                            previousTime = d[0];
                            timeIndex++;
                        }

                        var xPos = timeIndex * w;
                        return xPos;
                    })
                    .attr("y", function(d, i) {
                        var yPos = Math.round(y(d[1]));
                        //console.log('y: ' + d[1] + ' -> ' + yPos);
                        return yPos;
                    })
                    .attr("width", function(d) {
                        return w;
                    })
                    .attr("height", function(d) {
                        return h;
                    })
                    .style("fill", function(d) {
                        var zPos = z(d[2]);
                        return zPos;
                    });

            //Add a y-axis with label.
            var yAxis = d3.svg.axis().scale(y)
                    .orient("left")
                    .ticks(3);
            yAxisSvg.append('g')
                    .attr('class', 'y_ticks plain')
                    .attr('transform', 'translate(60,0)')
                    .call(yAxis);

            if (typeof xAxisSvg !== 'undefined') {
                //Add a x-axis with labels.
                var xTimeScale = d3.time.scale().domain([minX, maxX]).range([0, width]);
                var xAxis = d3.svg.axis().scale(xTimeScale)
                        .orient("bottom")
                        .ticks(10)
                        .tickFormat(d3.time.format('%M:%S'));
                xAxisSvg
                        //.attr('transform', 'translate(0,' + (height -1) + ')')
                        .append('g')
                        .attr('class', 'x_ticks_d3 plain')
                        //.attr('transform', 'translate(0,-1)')
                        .call(xAxis);
            }


        }

        function resourceFocused(event, parameter) {
            if (typeof sandbox.focusState.panel !== 'undefined') {
                setPlace();

                _.each(configuration.axes, function(axisName, index) {

                    var graphAreas = tile.place.find('[data-name=grapharea]:eq(' + index + ')');

                    var yAxisPlace = tile.place.find('.rickshaw_red9_y_axis:eq(' + index + ')');
                    var xAxisPlace = tile.place.find('.rickshaw_red9_x_axis:eq(' + index + ')');

                    var graphWidth = graphAreas.parent().parent().width()
                            - yAxisPlace.width();

                    var graphHeight = configuration.height;

                    var data = sandbox.focusState.panel.spectralEntropy[axisName];
                    if (typeof data !== 'undefined') {
                        var graphSvg = d3.select(graphAreas[0])
                                .append('svg')
                                .attr('height', graphHeight)
                                .attr('width', graphWidth);
                        var xAxisSvg;
                        if (xAxisPlace.length !== 0) {
                            xAxisSvg = d3.select(xAxisPlace[0])
                                    .append('svg')
                                    .attr('height', xAxisPlace.height())
                                    .attr('width', graphWidth)
                                    .attr('class', 'rickshaw_graph x_axis_d3');
                        }
                        var yAxisSvg = d3.select(yAxisPlace[0])
                                .append('svg')
                                .attr('height', graphHeight)
                                .attr('width', yAxisPlace.width())
                                .attr('class', 'rickshaw_graph y_axis');

                        setTimeout(function() {
                            var startTime = new Date().getTime();
                            createHeatmap(graphSvg, xAxisSvg, yAxisSvg, data);
                            console.log('Done computing heatmaps: ' + (new Date().getTime() - startTime) + ' ms');
                        },
                                500);
                    }
                });
            }
        }

        function destructor() {
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;
        }

        init();
        return {
            destructor: destructor
        };

    }


    return panelSpectralEntropy;

});