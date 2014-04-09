requirejs.config({
    noGlobal: true,
    baseUrl: "/js",
    paths: {
        customHandlebarsHelpers:'utilities/customHandlebarsHelpers'
    },
    shim: {
        'jQuery.validate': [
            'vendor/jquery'
        ],
        customHandlebarsHelpers:[
            'vendor/handlebars'
        ]

    }
});

require(['sandbox', 'vendor/jquery', 'vendor/underscore', 'vendor/bootstrap'], function(sandbox, $, _) {
    console.log('Is sandbox defined? ' + sandbox);
    sandbox.init();
    
    sandbox.apiUrl = $('#page_parameters').data('apiurl');
    sandbox.currentUser = $('#page_parameters').data('currentuser');
    //sandbox.apiUrl = '';
    //sandbox.currentUser = '{{user.id}}';

    var GetUSROperands = function() {
        return {};
    };
    $(document).ready(function() {




        GetUSROperands = function() {


            var result = {
                datasets: [
                    sandbox.focusState.dataset
                ]
            };
            return result;
        };



        $('#navbar-fixed-bottom-run-usr-button').on('click', function(element) {
            displayUsrModal();
        });

        $('#navbar-fixed-bottom-download-panel-button').on('click', function(element) {
            sandbox.resourceDownload('panel', sandbox.focusState.panel);
        });

        $('#navbar-fixed-bottom-edit-dataset-button').on('click', function(element) {
            sandbox.resourceEdit('dataset', sandbox.focusState.dataset);
        });

        $('#navbar-fixed-bottom-create-event-button').on('click', function(element) {
            /*var request_url = '/snippet/createeventmodal'
                    + '?startTime=' + sandbox.focusState.startTime
                    + '&endTime=' + sandbox.focusState.endTime
                    + '&dataset=' + sandbox.focusState.dataset;
*/
            sandbox.showModal('createresource', {
                resourceType:'event',
               startTime:sandbox.focusState.startTime,
               endTime:sandbox.focusState.endTime,
               dataset:sandbox.focusState.dataset
            });
            /*$("#create_event_modal").load(request_url, function() {
                $("#new_event_modal").modal('show');
            });*/
        });

        $('#navbar-fixed-bottom-zoom-out-button').on('click', function(element) {
            var zoom = calculateZoom('out',
                    sandbox.focusState.minStartTime,
                    sandbox.focusState.maxEndTime,
                    sandbox.focusState.startTime,
                    sandbox.focusState.endTime
                    );
            sandbox.resourceFocused('dataset', sandbox.focusState.dataset, zoom.startTime, zoom.endTime);
        });
        $('#navbar-fixed-bottom-zoom-out-full-button').on('click', function(element) {
            sandbox.resourceFocused('dataset', sandbox.focusState.dataset);
        });
        $('#navbar-fixed-bottom-zoom-in-button').on('click', function(element) {
            var zoom = calculateZoom('in',
                    sandbox.focusState.minStartTime,
                    sandbox.focusState.maxEndTime,
                    sandbox.focusState.startTime,
                    sandbox.focusState.endTime
                    );
            sandbox.resourceFocused('dataset', sandbox.focusState.dataset, zoom.startTime, zoom.endTime);
        });



    });

    function calculateZoom(zoomDirection, datasetStartTime, datasetEndTime, currentStartTime, currentEndTime) {
        var result = {};
        var zoomOutTime = currentEndTime - currentStartTime;
        var zoomInTime = Math.floor(zoomOutTime / 3);

        if (_.isString(currentStartTime)) {
            console.log('currentStartTime is string...');
        }

        if (_.isString(zoomInTime)) {
            console.log('zoomInTime is string...');
        }

        console.log('zoomInTime: ' + zoomInTime);

        if (zoomDirection === 'in') {
            if (typeof currentStartTime === 'undefined' || typeof currentEndTime === 'undefined') {
                // Zoom in and don't know where from
                return {};
            }


            result = {
                startTime: currentStartTime + zoomInTime,
                endTime: currentEndTime - zoomInTime
            };
        } else { // Zoom direction === 'out'
            if (typeof currentStartTime === 'undefined' || typeof currentEndTime === 'undefined'
                    || typeof datasetStartTime === 'undefined' || typeof datasetEndTime === 'undefined') {
                // Zoom out to we don't know where.
                return {};
            }

            result = {
                startTime: currentStartTime - zoomOutTime,
                endTime: currentEndTime + zoomOutTime
            };
        }

        // Make sure the difference isn't too small.
        if (result.endTime <= result.startTime) {
            result.endTime = result.startTime + 1;
        }

        // Make sure they're not too big
        if (result.startTime < datasetStartTime) {
            delete result.startTime;
        }

        if (result.endTime > datasetEndTime) {
            delete result.endTime;
        }

        return result;
    }



    var usrModalInstance;
    function displayUsrModal() {

        if (typeof usrModalInstance === 'undefined') {
            console.log('First time load...');
            // First time, load modal
            $('#usr_modal_div').load('/snippet/usrmodal', function() {
                usrModalInstance = new usrModal();
                usrModalInstance.show();
            });
        } else {
            usrModalInstance.show();
        }

    }

});
