define(['vendor/jquery', 'sandbox', 'vendor/jquery.validate'], function($, sandbox) {
    function createResourceModal(myPlace, configuration) {

        if (configuration.resourceType === 'event') {
            this.showEventModal($, sandbox, myPlace, configuration);
        } else {
            console.log('Can not show resource type modal.');
        }
    }


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
        console.log('Got valid form');

        var resourceType = 'unknown';
        var formValues = {};

        // Convert the HTML form into a key/value list.
        $(form).find('input, select, textarea')
                .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                .each(function() {
                    var $this = $(this);

                    if ($this.attr('name') === 'resourceType') {
                        resourceType = $this.val(); // Special case: pull it out.
                    } else {
                        formValues[$this.attr('name')] = $this.val();
                    }

                });

        sandbox.create(resourceType, formValues, function() {
        });
        $(form).parents('.modal').modal('hide');
        console.log('formValues: ' + JSON.stringify(formValues));
    }



    var schemas = {};
    schemas.event = {
        rules: {
            start_time: {
                required: true,
                min: 0
            },
            // The minimum for end_time should be at least start time + 1, 
            // but I don't know how to do that
            end_time: {
                required: true,
                min: 0
            }
        },
        messages: {
            start_time: {
                required: "Please enter a start time",
                min: "Time must be greater than 0"
            },
            end_time: {
                required: "Please enter an end time",
                min: "Time must be greater than start time"
            }
        },
        showErrors: showErrors,
        submitHandler: submitHandler
    };
    createResourceModal.prototype.showEventModal = function($, sandbox, myPlace, configuration) {
        sandbox.requestTemplate('modals/createresource', function(template) {
            $.ajax({
                type: 'GET',
                url: '/snippet/eventtype',
                dataType: 'json',
                success: function(eventTypes) {
                    var parameters = {
                        resourceTypeEvent: true,
                        resourceType: configuration.resourceType,
                        startTime: configuration.startTime,
                        endTime: configuration.endTime,
                        dataset: configuration.dataset,
                        eventTypes: eventTypes
                    };
                    myPlace.html(template(parameters));
                    myPlace.find('.modal').modal('show');
                    myPlace.find('form').validate(schemas.event);
                }
            });
        });
    };
    return createResourceModal;
});