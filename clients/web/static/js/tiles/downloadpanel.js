define(['vendor/jquery', 'vendor/jquery.validate'], function($) {

    function downloadPanelModal(sandbox, tile, configuration, doneCallback) {
        function init() {
            resourceDownload(configuration);
            doneCallback();
        }

        function setupColumnCheckboxHandling(tilePlace) {
            tilePlace.find('[data-name=column_checkbox_selection_group] a').each(function(index, element) {
                var link = $(element);
                var linkAction = link.attr('name');
                link.on('click', function() {
                    tilePlace.find('[data-name=column_checkboxes]').each(function(index, checkbox) {
                        $(checkbox).prop('checked',
                                {
                                    all: true,
                                    none: false,
                                    not: !$(checkbox).prop('checked')
                                }[linkAction]);
                    });
                });
            });
        }

        function resourceDownload(configuration) {
            sandbox.requestTemplate('downloadpanel', function(template) {
                configuration.resource.currentStartTime = sandbox.focusState.startTime;
                configuration.resource.currentEndTime = sandbox.focusState.endTime;
                tile.place.html(template(configuration.resource));
                setupForm();

                setupColumnCheckboxHandling(tile.place);

            });
        }


        function setupForm() {
            console.log('Lets set up the form');
            $.validator.addMethod("requiredIfChecked", function(currentValue, element, givenParameter) {
                if ($(element).parent().find('input[type=checkbox]').prop('checked') === givenParameter) {
                    console.log('Value: ' + $(element).val());
                    if ($(element).val().length === 0) {
                        return false;
                    } else {
                        return true;
                    }
                } else {
                    $(element).val(''); // Clear the input
                    return true;
                }
            }, "Must provide a value when checkbox selected");

            $.validator.addMethod("integer", function(value, element) {
                return this.optional(element) || /^\d+$/.test(value);
            }, "A positive non-decimal number please");

            tile.place.find('form').validate({
                rules: {
                    start_time_input: {
                        requiredIfChecked: true,
                        integer: true
                    },
                    end_time_input: {
                        requiredIfChecked: true,
                        integer: true
                    },
                    buckets_input: {
                        requiredIfChecked: true,
                        integer: true
                    }
                },
                showErrors: function(errorMap, errorList) {
                    console.log('show errors...');
                    // Clean up any tooltips for valid elements
                    $.each(this.validElements(), function(index, element) {
                        var $element = $(element);

                        $element.data("title", "") // Clear the title - there is no error associated anymore
                                .tooltip("destroy")
                                .closest('.form-group')
                                .removeClass('has-error');
                    });

                    // Create new tooltips for invalid elements
                    $.each(errorList, function(index, error) {
                        console.log('In list...' + index);
                        var $element = $(error.element);

                        $element.tooltip("destroy") // Destroy any pre-existing tooltip so we can repopulate with new tooltip content
                                .data("title", error.message)
                                .tooltip() // Create a new tooltip based on the error messsage we just set in the title
                                .closest('.form-group')
                                .addClass("has-error");

                    });
                },
                submitHandler: processForm
            });
        }



        function processForm() {
            var parameters = {
                format: 'csv'
            };

            if (tile.place.find('[name=start_time_checkbox]').prop('checked')) {
                parameters.startTime = tile.place.find('[name=start_time_input]').val();
            }

            if (tile.place.find('[name=end_time_checkbox]').prop('checked')) {
                parameters.endTime = tile.place.find('[name=end_time_input]').val();
            }

            if (tile.place.find('[name=buckets_checkbox]').prop('checked')) {
                parameters.buckets = tile.place.find('[name=buckets_input]').val();
            }

            if (tile.place.find('[name=minmax_checkbox]').prop('checked')) {
                parameters.minmax = true;
            }


            parameters.axes = '';
            tile.place.find('[data-name=column_checkboxes]').each(function(index, checkbox) {
                if ($(checkbox).prop('checked')) {
                    if (parameters.axes.length !== 0) {
                        parameters.axes += ',';
                    }
                    parameters.axes += $(checkbox).attr('value');
                }
            });



            var url = sandbox.apiUrl + '/panel/' + configuration.resource.id + '/body/?' + $.param(parameters);

            var win = window.open(url, '_blank');
            win.focus();

            console.log('url: ' + url);

            tile.place.find('[data-name=download-perma-link]').attr('href', url).removeClass('hide');

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
    return downloadPanelModal;
});


