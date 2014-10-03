define(['vendor/jquery', 'utilities/commentList'], function($) {
    function comments(sandbox, tile, configuration, doneCallback) {
        function init() {
            tile.setTitle('Comments');
            setResource('dataset', sandbox.getCurrentDatasetId());
        }

        function setResource(type, id) {
            tile.place.html($('<div></div>').commentList(id, type));
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

    return comments;
});