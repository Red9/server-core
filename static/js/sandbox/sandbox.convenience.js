define(['vendor/jquery', 'vendor/moment', 'vendor/moment-timezone', 'vendor/moment-timezone-data'], function($, moment) {
    function sandboxConvenience(sandbox) {
        // Convenience Methods
        sandbox.displayEditResourceDialog = function(type, id) {
            sandbox.get(type, {id: id}, function(resourceList) {
                if (resourceList.length === 1) {
                    sandbox.showModal('modifyresource',
                            {
                                resourceAction: 'edit',
                                resourceType: type,
                                resource: resourceList[0]
                            });
                }
            });
        };

        sandbox.getCurrentDatasetId = function() {
            if (typeof sandbox.focusState.dataset !== 'undefined') {
                return sandbox.focusState.dataset.id;
            } else if (typeof sandbox.focusState.event !== 'undefined') {
                return sandbox.focusState.event.datasetId;
            }
        };

        sandbox.showJqueryValidateErrors = function(errorMap, errorList) {
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
        };
    }
    return sandboxConvenience;
});


