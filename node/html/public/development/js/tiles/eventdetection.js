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
                windowSize: "16",
                threshold: "0.75",
                overlapStep: "50",
                mergeThreshold: '100'
            }
        };

        var sessionOptions = {
            wave: [
                {
                    name: 'eventType',
                    type: 'selection',
                    default: 'Wave',
                    description: ''
                },
                {
                    name: 'strictness',
                    type: 'float',
                    default: 1,
                    description: ''
                },
                {
                    name: 'windowSize',
                    type: 'int',
                    default: 256,
                    description: ''
                },
                {
                    name: 'overlapStep',
                    type: 'int',
                    default: 50,
                    description: ''
                },
                {
                    name: 'wThresholdDirection',
                    type: 'selection',
                    options: [
                        {
                            value: 'above',
                            name: 'Above',
                            selected: true
                        },
                        {
                            value: 'below',
                            name: 'Below'
                        }
                    ],
                    description: ''
                },
                {
                    name: 'pThresholdDirection',
                    type: 'selection',
                    options: [
                        {
                            value: 'above',
                            name: 'Above'
                        },
                        {
                            value: 'below',
                            name: 'Below',
                            selected: true
                        }
                    ],
                    default: 'below',
                    description: ''
                },
                {
                    name: 'tThresholdDirection',
                    type: 'selection',
                    options: [
                        {
                            value: 'above',
                            name: 'Above'
                        },
                        {
                            value: 'below',
                            name: 'Below',
                            selected: true
                        }
                    ],
                    description: ''
                },
                {
                    name: 'wThreshold',
                    type: 'float',
                    default: 0.8,
                    description: ''
                },
                {
                    name: 'pThreshold',
                    type: 'float',
                    default: 1.5,
                    description: ''
                },
                {
                    name: 'tThreshold',
                    type: 'float',
                    default: 1.5,
                    description: ''
                },
                {
                    name: 'wMergeThreshold',
                    type: 'float',
                    default: 500,
                    description: ''
                },
                {
                    name: 'pMergeThreshold',
                    type: 'float',
                    default: 200,
                    description: ''
                },
                {
                    name: 'tMergeThreshold',
                    type: 'float',
                    default: 200,
                    description: ''
                },
                {
                    name: 'ampThreshold',
                    type: 'float',
                    default: 0.1,
                    description: ''
                },
                {
                    name: 'accThreshold',
                    type: 'float',
                    default: 0.7,
                    description: ''
                },
                {
                    name: 'g',
                    type: 'float',
                    default: 10,
                    description: ''
                },
                {
                    name: 'minLength',
                    type: 'float',
                    default: 5,
                    description: ''
                },
                {
                    name: 'maxAcc',
                    type: 'float',
                    default: 11,
                    description: ''
                },
                {
                    name: 'maxAcc2',
                    type: 'float',
                    default: 15,
                    description: ''
                },
                {
                    name: 'speedThresh',
                    type: 'float',
                    default: 0.2,
                    description: ''
                },
                {
                    name: 'accPortion1',
                    type: 'float',
                    default: 0.6,
                    description: ''
                },
                {
                    name: 'accPortion2',
                    type: 'float',
                    default: 0.3,
                    description: ''
                },
                {
                    name: 'accPortion3',
                    type: 'float',
                    default: 0.15,
                    description: ''
                }
            ],
            paddle: [
                {
                    name: 'eventType',
                    type: 'selection',
                    default: 'Paddle',
                    description: ''
                },
                {
                    name: 'windowSize',
                    type: 'int',
                    default: 256,
                    description: ''
                },
                {
                    name: 'overlapStep',
                    type: 'int',
                    default: 50,
                    description: ''
                },
                {
                    name: 'pThresholdDirection',
                    type: 'selection',
                    options: [
                        {
                            value: 'above',
                            name: 'Above'
                        },
                        {
                            value: 'below',
                            name: 'Below',
                            selected: true
                        }
                    ],
                    description: ''
                },
                {
                    name: 'pThreshold',
                    type: 'float',
                    default: 1.5,
                    description: ''
                },
                {
                    name: 'pMergeThreshold',
                    type: 'float',
                    default: 200,
                    description: ''
                },
                {
                    name: 'minLength',
                    type: 'float',
                    default: 5,
                    description: ''
                }
            ],
            duckdive: [
                {
                    name: 'eventType',
                    type: 'selection',
                    default: 'Duck Dive',
                    description: ''
                },
                {
                    name: 'windowSize',
                    type: 'int',
                    default: 256,
                    description: ''
                },
                {
                    name: 'overlapStep',
                    type: 'int',
                    default: 50,
                    description: ''
                },
                {
                    name: 'dThresholdDirection',
                    type: 'selection',
                    options: [
                        {
                            value: 'above',
                            name: 'Above',
                            selected: true
                        },
                        {
                            value: 'below',
                            name: 'Below'
                        }
                    ],
                    description: ''
                },
                {
                    name: 'dThreshold',
                    type: 'float',
                    default: 0.8,
                    description: ''
                },
                {
                    name: 'dMergeThreshold',
                    type: 'float',
                    default: 100,
                    description: ''
                },
                {
                    name: 'lowThX',
                    type: 'float',
                    default: 0.4,
                    description: ''
                },
                {
                    name: 'hiThX',
                    type: 'float',
                    default: 0.3,
                    description: ''
                },
                {
                    name: 'lowThZ',
                    type: 'float',
                    default: 0.3,
                    description: ''
                },
                {
                    name: 'hiThZ',
                    type: 'float',
                    default: 0.5,
                    description: ''
                },
                {
                    name: 'minLengthX',
                    type: 'float',
                    default: 30,
                    description: ''
                },
                {
                    name: 'varLength',
                    type: 'float',
                    default: 10,
                    description: ''
                },
                {
                    name: 'minLengthZ',
                    type: 'float',
                    default: 20,
                    description: ''
                }
            ]
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
                },
                session: {
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
                    console.log('update: "' + update + '"');
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
            var clickedOption = $(this);
            var type = clickedOption.data('name');
            var datasetId = sandbox.getCurrentDatasetId();


            if (type === 'console') {
                setToConsole();
                return;
            }

            sandbox.requestTemplate('eventdetection.' + type, function(template) {
                if (type === 'session') {
                    sandbox.get('eventtype', {}, function(eventTypes) {
                        var command = clickedOption.data('command');

                        // Special map for event type selection. Avoids hard
                        // coding the types and gets them dynamically from the
                        // API server.
                        var fields = _.map(sessionOptions[command], function(value, index) {
                            if (value.name === 'eventType') {
                                value.options = _.map(eventTypes, function(type) {
                                    if (type.name === value.default) {
                                        type.selected = true;
                                    }
                                    type.value = type.name; // Map so that the select statement works correctly.
                                    return type;
                                });
                            }
                            return value;

                        });




                        var parameters = {
                            command: command,
                            datasetId: datasetId,
                            fields: fields
                        };
                        tile.place.html(template(parameters));
                        var $form = tile.place.find('form');
                        $form.validate(schema.session);
                    });

                } else {
                    // Random and Spectral
                    sandbox.get('eventtype', {}, function(eventTypes) {
                        sandbox.get('dataset', {id: datasetId}, function(datasetList) {
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
                }

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