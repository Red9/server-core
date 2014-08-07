define(['vendor/jquery', 'vendor/underscore', 'vendor/jquery.validate'], function($, _) {
    function fcpxmldialog(sandbox, tile, configuration, doneCallback) {

        var schema = {
            showErrors: sandbox.showJqueryValidateErrors,
            submitHandler: submitHandler
        };

        function init() {
            tile.setTitle('Download FCPXML File');
            showForm(tile.place, configuration);
            doneCallback();
        }

        function submitHandler(form) {
            var $form = $(form);
            var formValues = {};

            // Convert the HTML form into a key/value list.
            $form.find('input, select, textarea')
                    .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                    .each(function() {
                        var $this = $(this);
                        var key = $this.attr('name');
                        var value = $this.val();
                        formValues[key] = value;
                    });


            // Extract the filenames into an array.
            formValues.files = [];
            for (var i = 0; ; i++) {
                var key = "file" + i;
                var value = formValues[key];
                if (typeof value === 'undefined') {
                    // Not included in the form.
                    break;
                } else if (value === '') {
                    // Default of empty string
                } else {
                    // Video path
                    formValues.files.push(value);
                }
                delete formValues[key];
            }

            console.log('Got the following form values: ' + JSON.stringify(formValues, null, '   '));

            sandbox.requestTemplate('fcpxml', function(template) {
                window.open('data:text/xml,' + encodeURIComponent(template({})));
                tile.destructor();
            });
        }

        function showForm(place, configuration) {
            sandbox.requestTemplate('embeddedvideo.fcpxmldialog', function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {
                    _.each(eventTypes, function(type) {
                        if (type.name === 'Wave') {
                            type.selected = 'selected';
                        } else {
                            type.selected = '';
                        }
                    });

                    var parameters = {
                        eventTypes: eventTypes,
                        frameRates: [
                            {
                                name: 29.97
                            },
                            {
                                name: 59.94,
                                selected: 'selected'
                            }
                        ],
                        videoSizes: [
                            {
                                name: '1280x720',
                                selected: 'selected'
                            }
                        ],
                        datasetId: configuration.datasetId
                    };
                    place.html(template(parameters));
                    place.find('form').validate(schema);
                });


            });
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
    return fcpxmldialog;
});