requirejs.config({
    noGlobal: true,
    baseUrl: "/js",
    paths: {
        customHandlebarsHelpers: 'utilities/customHandlebarsHelpers',
        socketio: 'http://action.localdev.redninesensor.com/socket.io/socket.io'
    },
    shim: {
        'jQuery.validate': [
            'vendor/jquery'
        ],
        customHandlebarsHelpers: [
            'vendor/handlebars'
        ]

    }
});

require(['sandbox', 'vendor/jquery', 'vendor/underscore', 'vendor/bootstrap'], function(sandbox, $, _) {
    sandbox.actionUrl = $('#page_parameters').data('actionurl');
    sandbox.apiUrl = $('#page_parameters').data('apiurl');
    sandbox.currentUser = $('#page_parameters').data('currentuser');
    
    sandbox.init();

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

        $('#navbar-fixed-bottom-edit-layout-button').on('click', function(element) {
            sandbox.showModal('layouteditor', {});
        });

        $('#navbar-fixed-bottom-download-panel-button').on('click', function(element) {
            sandbox.downloadPanelDisplay(sandbox.focusState.panel);
        });

        $('#navbar-fixed-bottom-edit-dataset-button').on('click', function(element) {
            sandbox.editResourceDisplay('dataset', sandbox.focusState.dataset);
        });

        $('#navbar-fixed-bottom-create-event-button').on('click', function(element) {
            sandbox.createResourceDisplay('event', {
                startTime: sandbox.focusState.startTime,
                endTime: sandbox.focusState.endTime,
                datasetId: sandbox.focusState.dataset
            });
        });
        $('[data-name=navbar-fixed-bottom-zoom-button]').on('click', function() {
            var zoom = calculateZoom($(this).data('direction'),
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
        var currentDuration = currentEndTime - currentStartTime;
        var zoomInTime = Math.floor(currentDuration / 3);

        if (_.isString(currentStartTime)) {
            console.log('currentStartTime is string...');
        }

        if (_.isString(zoomInTime)) {
            console.log('zoomInTime is string...');
        }

        if (zoomDirection === 'outfull') {
            return {};
        } else if (zoomDirection === 'left') {
            if (typeof currentStartTime === 'undefined' || typeof currentEndTime === 'undefined') {
                // Zoom left and don't know where from
                return {};
            }

            result = {
                startTime: currentStartTime - zoomInTime,
                endTime: currentEndTime - zoomInTime
            };
        } else if (zoomDirection === 'right') {
            if (typeof currentStartTime === 'undefined' || typeof currentEndTime === 'undefined') {
                // Zoom right and don't know where from
                return {};
            }

            result = {
                startTime: currentStartTime + zoomInTime,
                endTime: currentEndTime + zoomInTime
            };
        } else if (zoomDirection === 'in') {
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
                startTime: currentStartTime - currentDuration,
                endTime: currentEndTime + currentDuration
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