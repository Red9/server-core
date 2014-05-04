define([], function() {
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

        sandbox.getCurrentDataset = function() {
            if (typeof sandbox.focusState.dataset !== 'undefined') {
                return sandbox.focusState.dataset.id;
            } else if (typeof sandbox.focusState.event !== 'undefined') {
                return sandbox.focusState.event.datasetId;
            }
        };


    }
    return sandboxConvenience;
});


