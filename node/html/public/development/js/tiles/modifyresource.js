define(['vendor/jquery', 'vendor/underscore', 'vendor/jquery.validate'], function($, _) {
    function modifyResource(sandbox, tile, configuration, doneCallback) {
        showForm(tile.place, configuration);
        doneCallback();



        function showErrors(errorMap, errorList) {
            // Taken from http://icanmakethiswork.blogspot.com/2013/08/using-bootstrap-tooltips-to-display.html
            // Clean up any tooltips for valid elements
            $.each(this.validElements(), function(index, element) {
                var $element = $(element);
                $element.parent().removeClass("has-error");
                $element.data("title", "") // Clear the title - there is no error associated anymore
                        .tooltip("destroy");
            });
            // Create new tooltips for invalid elements
            $.each(errorList, function(index, error) {
                var $element = $(error.element);
                $element.parent().addClass("has-error");
                $element.tooltip("destroy") // Destroy any pre-existing tooltip so we can repopulate with new tooltip content
                        .data("title", error.message)
                        .tooltip(); // Create a new tooltip based on the error messsage we just set in the title
            });
        }

        function submitHandler(form) {
            var $form = $(form);

            var resourceAction = $form.data('resourceaction');
            var resourceType = $form.data('resourcetype');
            var formValues = {};

            // Convert the HTML form into a key/value list.
            $form.find('input, select, textarea')
                    .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                    .each(function() {
                        var $this = $(this);
                        var key = $this.attr('name');
                        var value = $this.val();
                        var defaultValue = $this.data('default'); // Somewhere number defaults are sticking as numbers...
                        defaultValue = typeof defaultValue === 'undefined' ? '' : defaultValue.toString();

                        if (resourceAction === 'create'
                                || (resourceAction === 'edit' && value !== '' && value !== defaultValue)) {
                            formValues[key] = value;
                        }
                    });

            if (resourceAction === 'edit') {
                var id = formValues.id;
                delete formValues.id;
                sandbox.update(resourceType, id, formValues, function(error) {
                    if (error) {
                        $form.find('[data-name=submitwarning]').text(error).removeClass('hide');
                    } else {
                        tile.destructor();
                    }
                });
            } else if (resourceAction === 'create') {
                sandbox.create(resourceType, formValues, function(error) {
                    if (error) {
                        $form.find('[data-name=submitwarning]').text(error).removeClass('hide');
                    } else {
                        tile.destructor();
                    }
                });
            } else {
                tile.destructor();
                console.log('Unknown resource action ' + resourceAction);
            }

            console.log('Do ' + resourceAction + ' with type ' + resourceType + ' and formValues: ' + JSON.stringify(formValues));
        }



        var schemas = {};
        schemas.event = function(create) {
            return {
                rules: {
                    startTime: {
                        required: create,
                        min: 0
                    },
                    // The minimum for end_time should be at least start time + 1, 
                    // but I don't know how to do that
                    endTime: {
                        required: create,
                        min: 0
                    }
                    //type: required implicitly by being a select box. 
                },
                messages: {
                    startTime: {
                        required: "Please enter a start time",
                        min: "Time must be greater than 0"
                    },
                    endTime: {
                        required: "Please enter an end time",
                        min: "Time must be greater than start time"
                    }
                },
                showErrors: showErrors,
                submitHandler: submitHandler
            };
        };

        schemas.dataset = function(create) {
            return {
                rules: {
                    title: {
                        required: create
                    },
                    owner: {
                        required: create
                    },
                    timezone: {
                        required: create
                    }
                },
                showErrors: showErrors,
                submitHandler: submitHandler
            };
        };

        schemas.video = function(create) {
            return {
                rules: {
                    startTime: {
                        required: create,
                        min: 0
                    },
                    hostId: {
                        required: create
                    }
                },
                showErrors: showErrors,
                submitHandler: submitHandler
            };
        };

        function showForm(place, configuration) {
            var parameters = {
                resourceAction: configuration.resourceAction,
                resourceActionText: configuration.resourceAction.charAt(0).toUpperCase() + configuration.resourceAction.slice(1), // Capitalize the first letter of the word.
                resourceType: configuration.resourceType,
                resourceTypeText: configuration.resourceType.charAt(0).toUpperCase() + configuration.resourceType.slice(1), // Capitalize the first letter of the word.
            };
            var amCreating = configuration.resourceAction === 'create';

            sandbox.requestTemplate('modifyresource', function(template) {
                if (configuration.resourceType === 'event') {
                    $.ajax({// This is a hack, and should be moved to the API
                        type: 'GET',
                        url: sandbox.apiUrl + '/eventtype/',
                        dataType: 'json',
                        success: function(eventTypes) {
                            var event = configuration.resource;

                            // If we're editing let's preselect the current event type.
                            var foundType = amCreating;
                            _.each(eventTypes, function(type) {
                                if (type.name === event.type) {
                                    type.selected = true;
                                    foundType = true;
                                }
                            });

                            // If we're editing, and the type is not in the event type list
                            // then go ahead and add it as the selected item.
                            if (foundType === false) {
                                eventTypes.unshift({
                                    name: event.type,
                                    selected: true
                                });
                            }

                            event.typeList = eventTypes;

                            parameters.resourceTypeEvent = true;
                            parameters.event = event;

                            place.html(template(parameters));
                            place.find('form').validate(schemas.event(amCreating));
                        }
                    });
                } else if (configuration.resourceType === 'dataset') {
                    parameters.dataset = configuration.resource;
                    parameters.resourceTypeDataset = true;

                    place.html(template(parameters));
                    place.find('form').validate(schemas.dataset(amCreating));
                } else if (configuration.resourceType === 'video') {
                    parameters.video = configuration.resource;
                    parameters.video.typeList = [
                        {
                            name: 'YouTube'
                        }
                    ];
                    parameters.resourceTypeVideo = true;

                    place.html(template(parameters));
                    place.find('form').validate(schemas.video(amCreating));
                } else {
                    console.log('modify resource does not support resource type ' + configuration.resourceType);
                }
            });
        }
    }
    return modifyResource;
});