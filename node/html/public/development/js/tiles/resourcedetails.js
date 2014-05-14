define(['vendor/jquery', 'utilities/commentList'], function($) {
    function resourceDetails(sandbox, tile, configuration, doneCallback) {
        function init() {
            tile.setTitle('details');

            if (typeof configuration.type !== 'undefined'
                    && configuration.id !== 'undefined') {
                setResource(configuration.type, configuration.id);
            } else {
                tile.addListener('totalState-resource-focused', resourceFocused);
                // Default to what's currently visible
                setResource('dataset', sandbox.getCurrentDataset());
            }
            doneCallback();
        }

        function setResource(type, id) {
            var expand = type === 'dataset' ? ['headPanel', 'owner'] : undefined;
            sandbox.get(type, {id: id}, function(resourceList) {
                var resource = resourceList.length === 0 ? {} : resourceList[0];
                sandbox.requestTemplate('resourcedetails.' + type, function(template) {
                    var parameters = {
                        apiUrl: sandbox.apiUrl,
                        type: type.charAt(0).toUpperCase() + type.slice(1)
                    };
                    parameters[type] = resource;

                    tile.place.html(template(parameters));
                });
            }, expand);
        }

        function resourceFocused(event, parameter) {
            setResource(parameter.type, parameter.id);
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

    return resourceDetails;
});