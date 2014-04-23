define(['vendor/jquery', 'vendor/underscore', 'vendor/rickshaw', 'sandbox'], function($, _, Rickshaw, sandbox) {
    function panelDistribution(myPlace, configuration, doneCallback) {
        var graph;
        var graphData = [];


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
            myPlace.html(template({}));


        });

        function resourceFocused(event, parameter) {
            if (typeof parameter.panel !== 'undefined') {
                while (graphData.length > 0) { // Clear array
                    graphData.pop();
                }
                _.each(parameter.panel.distributions, function(distribution) {
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
                            color: sandbox.definedColorMappings[distribution.name]
                        });
                    }
                });

                if (typeof graph === 'undefined') {
                    var graphArea = myPlace.find('[data-name=grapharea]')[0];
                    graph = new Rickshaw.Graph({
                        element: graphArea,
                        renderer: 'line',
                        //height: 400,
                        stack: false,
                        series: graphData
                    });

                    graph.render();
                    var xAxis = new Rickshaw.Graph.Axis.X({
                        graph: graph
                    });
                    xAxis.render();

                    var yAxis = new Rickshaw.Graph.Axis.Y({
                        graph: graph
                    });
                    yAxis.render();


                } else {
                    graph.render();
                    console.log('updating distribution');
                    /*graph.configure({
                     series: rickshawDistributions
                     });*/
                    //graph.series = rickshawDistributions;
                }



            }
        }

        $(sandbox).on('totalState.resource-focused', resourceFocused);
        doneCallback();
    }


    return panelDistribution;

});