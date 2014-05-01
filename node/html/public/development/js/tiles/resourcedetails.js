define(['vendor/jquery', 'utilities/commentList'], function($) {
    function resourceDetails(sandbox, tile, configuration, doneCallback) {
        tile.setTitle('details');
        tile.addListener('totalState-resource-focused', resourceFocused);
        setResource('dataset', {});

        doneCallback();
        
        function setResource(type, resource) {

            var details = {
                apiUrl: sandbox.apiUrl
            };

            if (type === 'dataset') {
                sandbox.requestTemplate('datasetdetails', function(template) {
                    details.dataset = resource;
                    tile.place.html(template(details));
                    tile.place.find('[data-name=commentsDiv]').commentList(resource.id, type);
                });
            }
        }

        function resourceFocused(event, parameters) {
            if (parameters.type === 'dataset') {
                setResource('dataset', parameters.resource);
            } else if (parameters.type === 'event') {
                // TODO(SRLM): Check to make sure that the event is still in the same
                // dataset. If it's not then we probably need to remove the details or 
                // update them. This could be an issue for when we allow changing events
                // and go to a "new page".

            }
        }
    }

    return resourceDetails;
});