function editResourceModal(myPlace, configuration, doneCallback) {
    this.myPlace = myPlace;
    $(sandbox).on('totalState.resource-edit', $.proxy(this.resourceEdit, this));
    doneCallback();
}


editResourceModal.prototype.resourceEdit = function(event, parameters) {
    var self = this;
    sandbox.getSchema(parameters.type, function(schema) {
        sandbox.requestTemplate('editresourcemodal', function(template) {
            var displaySchema = {
                title: 'Edit ' + parameters.type,
                type: parameters.type,
                id: parameters.resource.id,
                editable: {},
                static: {}
            };
            if (parameters.type === 'dataset') {
                displaySchema.title += ' "' + parameters.resource.title + '"';
            } else if (parameters.type === 'event') {
                displaySchema.title += ' "' + parameters.resource.type + '"';
            }

            _.each(schema, function(properties, key) {
                console.log('Key ' + key);
                if (properties.editable === true) {
                    displaySchema.editable[key] = properties;
                    displaySchema.editable[key].currentValue = parameters.resource[key];
                } else {
                    displaySchema.static[key] = properties;
                    displaySchema.static[key].currentValue = parameters.resource[key];
                }
            });

            self.myPlace.html(template(displaySchema));
            self.myPlace.find('.modal').modal('show');
            $.proxy(self.setupForm(), self);
        });
    });
};

editResourceModal.prototype.setupForm = function() {
    this.myPlace.find('form').validate({
        submitHandler: $.proxy(this.processForm, this)
    });
};


editResourceModal.prototype.processForm = function() {
    //this.myPlace.find('.modal').modal('hide');

    console.log('Got form!');

    var newValues = {};

    this.myPlace.find('input[data-name=editable]').each(function(index, element) {
        element = $(element);
        if (element.val().length > 0) {
            newValues[element.attr('name')] = element.val();
        }
    });

    var self = this;
    if (_.isEmpty(newValues) === false) {
        sandbox.update(
                $('form').attr('data-type'),
                $('form').attr('data-id'),
                newValues,
                function(err) {
                    if (typeof err !== 'undefined') {
                        self.myPlace.find('[data-name=submitWarning]').removeClass('hide').text('Error setting fields: ' + err);
                    }else{
                        self.myPlace.find('[data-name=submitSuccess]').removeClass('hide').append('<br/>Successfully set at least 1 field. You may exit now.');
                    }
                }
        );
    }



};