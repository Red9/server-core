define(['vendor/jquery', 'vendor/underscore', 'vendor/rickshaw', 'sandbox'], function($, _, Rickshaw, sandbox) {

    function panelFFT(myPlace, configuration, doneCallback) {
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


        sandbox.requestTemplate('panelfft', function(template) {
            myPlace.html(template({}));
        });




        function resourceFocused(event, parameter) {
            if (typeof parameter.panel !== 'undefined') {
                // Clear array, but keep reference to "root" array.
                while (graphData.length > 0) {
                    graphData.pop();
                }

                // Extract the columns into what X,Y points
                 var fftColumns = parameter.panel.fft.columns;
                _.each(configuration.axes, function(axisName) {
                    // Only graph axes that are in both our configuration and
                    // in the data...
                    if (_.has(fftColumns, axisName) === true) {
                        console.log('Adding '+ axisName + ' to graph...');
                        var data = [];

                        _.each(fftColumns.frequency, function(frequency, index) {
                            console.log('+');
                            data.push({
                                x: frequency,
                                y: fftColumns[axisName][index]
                            });
                        });
                        graphData.push({
                            data: data,
                            color: sandbox.colorMap(axisName)
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
                    console.log('updating fft');
                    /*graph.configure({
                     series: rickshawDistributions
                     });*/
                    //graph.series = rickshawDistributions;
                }



            }
        }





        $(sandbox).on('totalState-resource-focused', resourceFocused);
        doneCallback();
    }


    return panelFFT;

});