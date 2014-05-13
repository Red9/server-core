define(['vendor/jquery', 'utilities/commentList'], function($) {
    function comments(sandbox, tile, configuration, doneCallback) {
        tile.setTitle('Comments');
        setResource('dataset', sandbox.getCurrentDataset());

        function setResource(type, id) {
            tile.place.html($('<div></div>').commentList(id, type));
        }

        function destructor() {
            $
                    = sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;
        }

        return {
            destructor: destructor
        };
    }

    return comments;
});