define(['vendor/jquery', 'vendor/underscore', 'socketio', 'vendor/jquery.validate'], function($, _, io) {
    function eventDetection(sandbox, tile, configuration, doneCallback) {
        var socket;
        var schema;

        // If we add to the preconfigured options then we have to manually add
        // the select option to the HTML.
        var preconfiguredOptions = {
            wave: {
                eventType: "Wave",
                axis: "acceleration:z",
                thresholdDirection: "above",
                windowSize: "256",
                threshold: "0.8",
                overlapStep: "50",
                mergeThreshold: '500'
            },
            paddle: {
                eventType: "Paddle",
                axis: "rotationrate:x",
                thresholdDirection: "below",
                windowSize: "256",
                threshold: "1.1",
                overlapStep: "50",
                mergeThreshold: '200'
            },
            tap: {
                eventType: "Tap",
                axis: "acceleration:z",
                thresholdDirection: "above",
                windowSize: "256",
                threshold: "0.8",
                overlapStep: "50",
                mergeThreshold: '200'
            }
        };

        function init() {
            schema = {
                random: {
                    rules: {
                        quantity: {
                            required: true,
                            number: true
                        }
                    },
                    showErrors: sandbox.showJqueryValidateErrors,
                    submitHandler: submitHandler
                },
                spectral: {
                    rules: {
                        windowSize: {
                            required: true,
                            number: true
                        },
                        threshold: {
                            required: true,
                            number: true
                        },
                        overlapStep: {
                            required: true,
                            number: true
                        }
                    },
                    showErrors: sandbox.showJqueryValidateErrors,
                    submitHandler: submitHandler
                }
            };
            tile.setTitle('Automated Event Detection');
            sandbox.requestTemplate('eventdetection', function(template) {
                tile.place.html(template({}));
                tile.place.find('[data-name=optionslist]').on('click', 'button', optionClicked);
            });
        }



        function setToConsole() {
            sandbox.requestTemplate('eventdetection.console', function(template) {
                tile.place.html(template({}));

                var $area = tile.place.find('.processing_notes');
                socket = io.connect(sandbox.actionUrl);

                socket.on('update', function(update) {
                    $area.append('<p class="processing_note">' + update + '</p>');
                    $area[0].scrollTop = $area[0].scrollHeight;
                });
            });
        }

        function submitHandler(form) {
            var $form = $(form);

            var formValues = {};
            // Convert the HTML form into a key/value list.
            // TODO(SRLM): This is duplicate code (mostly): should be refactored out to common method.
            $form.find('input, select, textarea')
                    .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                    .each(function() {
                        var $this = $(this);
                        var key = $this.attr('name');
                        var value = $this.val();
                        var defaultValue = $this.data('default'); // Somewhere number defaults are sticking as numbers...
                        defaultValue = typeof defaultValue === 'undefined' ? '' : defaultValue.toString();
                        formValues[key] = value;
                    });

            var type = formValues.type;
            delete formValues.type;

            if (type === 'spectral') {

                formValues.windowSize = parseFloat(formValues.windowSize);
                formValues.threshold = parseFloat(formValues.threshold);
                formValues.overlapStep = parseFloat(formValues.overlapStep);
                formValues.mergeThreshold = parseFloat(formValues.mergeThreshold);
            }

            sandbox.action.findEvent(type, formValues);
            setToConsole();
        }


        function setSpectralFormPreconfigured($form, configuration) {
            _.each(preconfiguredOptions[configuration], function(value, key) {
                $form.find('[name=' + key + ']').val(value);
            });
        }


        function optionClicked() {
            var type = $(this).data('name');

            if (type === 'console') {
                setToConsole();
                return;
            }

            sandbox.requestTemplate('eventdetection.' + type, function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {
                    sandbox.get('dataset', {id: sandbox.getCurrentDataset()}, function(datasetList) {
                        var dataset = datasetList[0];
                        tile.place.html(template({
                            axes: dataset.headPanel.axes,
                            datasetId: dataset.id,
                            eventTypes: eventTypes
                        }));
                        var $form = tile.place.find('form');
                        $form.validate(schema[type]);

                        if (type === 'spectral') {
                            var $preconfigured = $form.find('[name=preconfiguredOption]');
                            setSpectralFormPreconfigured($form, $preconfigured.val());
                            $preconfigured.on('change', function() {
                                setSpectralFormPreconfigured($form, $(this).val());
                            });
                        }
                    }, ['headPanel']);
                });

            });
        }

        function destructor() {
            console.log('Destructor...');
            if (typeof socket !== 'undefined') {
                console.log('Destroying socket...');
                socket.removeAllListeners();
            }
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = socket
                    = null;

        }

        init();
        return {
            destructor: destructor
        };
    }

    return eventDetection;
});