define(['vendor/jquery', 'vendor/underscore', 'vendor/jquery.validate'], function($, _) {
    function eventDetection(sandbox, tile, configuration, doneCallback) {
        initialize();


        function initialize() {
            sandbox.requestTemplate('eventdetection', function(template) {
                tile.place.html(template({}));


                tile.place.find('[data-name=optionslist]').on('click', 'button', optionClicked);
            });
        }

        var schema = {
            random: {
                rules: {
                    quantity: {
                        required: true,
                        number: true
                    }
                },
                showErrors: sandbox.showJqueryValidateErrors,
                submitHandler: submitHandler
            }
        };


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
            sandbox.action.findEvent(type, formValues);

            console.log('Form submitted: ' + JSON.stringify(formValues));
        }


        function optionClicked() {
            var type = $(this).data('name');

            sandbox.requestTemplate('eventdetection.' + type, function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {
                    tile.place.html(template({
                        datasetId: sandbox.getCurrentDataset(),
                        eventTypes: eventTypes
                    }));
                    tile.place.find('form').validate(schema.random);
                });

            });
        }
    }

    return eventDetection;
});