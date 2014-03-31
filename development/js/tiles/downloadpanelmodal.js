function downloadPanelModal(myPlace, configuration, doneCallback) {
    this.myPlace = myPlace;

    $(sandbox).on('totalState.resource-download', $.proxy(this.resourceDownload, this));

    doneCallback();
}


downloadPanelModal.prototype.setupColumnCheckboxHandling = function(myPlace) {
    myPlace.find('[data-name=column_checkbox_selection_group] a').each(function(index, element) {
        var link = $(element);
        var linkAction = link.attr('name');
        link.on('click', function() {
            myPlace.find('[data-name=column_checkboxes]').each(function(index, checkbox) {
                $(checkbox).prop('checked',
                        {
                            all: true,
                            none: false,
                            not: !$(checkbox).prop('checked')
                        }[linkAction]);
            });
        });
    });
};

downloadPanelModal.prototype.resourceDownload = function(event, parameters) {
    console.log('Download event');
    var self = this;
    if (parameters.type === 'panel') {
        sandbox.requestTemplate('downloadpanelmodal', function(template) {
            self.myPlace.html(template(parameters.resource));
            self.myPlace.find('.modal').modal('show');
            $.proxy(self.setupForm(), self);

            self.setupColumnCheckboxHandling(self.myPlace);

        });
    }
};


downloadPanelModal.prototype.setupForm = function() {
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

    this.myPlace.find('form').validate({
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
        submitHandler: $.proxy(this.processForm, this)
    });
};



downloadPanelModal.prototype.processForm = function() {
    var parameters = {
        format:'csv'
    };

    if (this.myPlace.find('[name=start_time_checkbox]').prop('checked')) {
        parameters.startTime = this.myPlace.find('[name=start_time_input]').val();
    }

    if (this.myPlace.find('[name=end_time_checkbox]').prop('checked')) {
        parameters.endTime = this.myPlace.find('[name=end_time_input]').val();
    }

    if (this.myPlace.find('[name=buckets_checkbox]').prop('checked')) {
        parameters.buckets = this.myPlace.find('[name=buckets_input]').val();
    }

    if (this.myPlace.find('[name=minmax_checkbox]').prop('checked')) {
        parameters.minmax = true;
    }
    
    
    parameters.axes = '';
    this.myPlace.find('[data-name=column_checkboxes]').each(function(index, checkbox) {
        if ($(checkbox).prop('checked')) {
            if(parameters.axes.length !== 0){
                parameters.axes += ',';
            }
            parameters.axes += $(checkbox).attr('value');
        }
    });

    
    
    var url=sandbox.apiUrl + '/panel/' + sandbox.focusState.panel + '/body/?' + $.param(parameters);
    
    var win=window.open(url, '_blank');
    win.focus();
    
    console.log('url: ' + url);
    
    this.myPlace.find('[data-name=download-perma-link]').attr('href', url);
    
};



