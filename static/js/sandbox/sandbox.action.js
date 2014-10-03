define(['vendor/jquery', 'vendor/underscore'
], function($, _) {
    function sandboxActions(sandbox) {

        function findEvent(type, parameters) {
            $.ajax({
                type: 'POST',
                url: sandbox.actionUrl + '/find/event/' + type,
                data: parameters,
                success: function() {
                    console.log('Event Find Success');
                },
                error: function() {
                    console.log('Event Find Error');
                }
            });
        }

        sandbox.action = {
            findEvent: findEvent
        };

    }

    return sandboxActions;

});