define(['vendor/jquery', 'vendor/underscore', 'vendor/d3', 'sandbox'], function($, _, d3, sandbox) {

    function panelSpectralEntropy(myPlace, configuration, doneCallback) {
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
            configuration.height = 75;
        }

        sandbox.requestTemplate('panelspectralentropy', function(template) {
            myPlace.html(template({}));
        });

        function createHeatmap(svg, data) {
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


            var xCount = 0;
            var previousX = -9007199254740992;
            for (var i = 0; i < data.length; i++) {
                var x = data[i][0];
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

                var y = data[i][1];
                if (y < minY) {
                    minY = y;
                }
                if (y > maxY) {
                    maxY = y;
                }

                var z = data[i][2];
                if (z < minZ) {
                    minZ = z;
                }
                if (z > maxZ) {
                    maxZ = z;
                }
            }

            var x = d3.scale.linear()
                    .range([0, width])
                    .domain([minX, maxX]);

            var y = d3.scale.linear()
                    .range([height, 0]) // reverse so that 0 is at the bottom
                    .domain([minY, maxY]);

            var z = d3.scale.log().domain([minZ, maxZ]);
            z.domain([0, 0.5, 1].map(z.invert));
            z.range(["green", "yellow", "red"]);


            //height of each row in the heatmap
            //width of each column in the heatmap

            var yCount = data.length / xCount;
            var w = width / xCount;
            var h = (height / yCount) + 1;

            var timeIndex = 0;
            var previousTime = data[0][0];

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


            //Add a x-axis with labels.
            var xTimeScale = d3.time.scale().domain([minX, maxX]).range([0, width]);
            var xAxis = d3.svg.axis().scale(xTimeScale)
                    .orient("bottom")
                    .ticks(10)
                    .tickFormat(d3.time.format('%M:%S'));
            svg.append("g")
                    //.attr('transform', 'translate(0,' + (height -1) + ')')
                    .attr('class', 'heatmapaxis')
                    .call(xAxis);

            //Add a y-axis with label.
            var yAxis = d3.svg.axis().scale(y).orient("right").ticks(5);
            svg.append("g")
                    .attr('transform', 'translate(' + 1 + ',0)')
                    .attr('class', 'heatmapaxis')
                    .call(yAxis);
        }

        function resourceFocused(event, parameter) {
            if (typeof parameter.panel !== 'undefined') {
                var graphArea = myPlace.find('[data-name=grapharea]').empty()[0];
                console.log('Computing heatmaps...');
                var startTime = new Date().getTime();
                _.each(configuration.axes, function(axisName) {
                    var data = parameter.panel.spectralEntropy[axisName];
                    if (typeof data !== 'undefined') {
                        var svg = d3.select(graphArea)
                                .append('svg')
                                .attr('height', configuration.height);
                        createHeatmap(svg, data);
                    }
                });
                
                console.log('Done computing heatmaps: ' + (new Date().getTime() - startTime) + ' ms');
            }
        }





        $(sandbox).on('totalState.resource-focused', resourceFocused);
        doneCallback();
    }


    return panelSpectralEntropy;

});