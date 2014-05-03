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

       
    }
    return sandboxConvenience;
});


