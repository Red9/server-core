define(['vendor/jquery', 'vendor/underscore', 'vendor/rickshaw'], function($, _, Rickshaw) {
    function panelDistribution(sandbox, tile, configuration, doneCallback) {
        var graph;
        var graphData;

        function init() {
            graphData = [];
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

            sandbox.requestTemplate('paneldistribution', function(template) {
                tile.place.html(template({}));
            });

            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.setTitle(sandbox.createHumanAxesString(configuration.axes) + ' distribution');
            doneCallback();
        }

        function clearGraphData() {
            while (graphData.length > 0) {
                graphData.pop();
            }
        }

        function resourceFocused(event, parameter) {
            if (typeof sandbox.focusState.panel !== 'undefined') {
                clearGraphData();
                _.each(sandbox.focusState.panel.distributions, function(distribution) {
                    if (_.indexOf(configuration.axes, distribution.name) !== -1) {
                        // Our configuration says that we want this axis
                        var data = _.reduce(distribution.distribution, function(result, value, index) {
                            var x = (value.maximum + value.minimum) / 2;
                            var y = value.count;
                            result.push({
                                x: x,
                                y: y
                            });
                            return result;
                        }, []);



                        graphData.push({
                            data: data,
                            color: sandbox.colorMap(distribution.name)
                        });
                    }
                });

                if (typeof graph === 'undefined') {

                    var graphArea = tile.place.find('[data-name=grapharea]');

                    var yAxisPlace = tile.place.find('.rickshaw_red9_y_axis');
                    var xAxisPlace = tile.place.find('.rickshaw_red9_x_axis');

                    var graphWidth = graphArea.parent().parent().width()
                            - yAxisPlace.width();

                    var graphHeight = graphArea.parent().parent().height()
                            - xAxisPlace.height();


                    graph = new Rickshaw.Graph({
                        element: graphArea[0],
                        renderer: 'line',
                        height: graphHeight,
                        width: graphWidth,
                        stack: false,
                        series: graphData
                    });

                    graph.render();
                    var xAxis = new Rickshaw.Graph.Axis.X({
                        graph: graph,
                        orientation: 'bottom',
                        element: xAxisPlace[0]
                    });
                    xAxis.render();

                    var yAxis = new Rickshaw.Graph.Axis.Y({
                        graph: graph,
                        orientation: 'left',
                        element: yAxisPlace[0]

                    });
                    yAxis.render();


                }
                graph.render();
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
                    = graphData
                    = null;

        }

        init();
        return {
            destructor: destructor
        };
    }


    return panelDistribution;

});