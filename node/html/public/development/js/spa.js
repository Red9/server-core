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
    sandbox.init();

    $(document).ready(function() {


        $('#navbar-fixed-bottom-edit-layout-button').on('click', function(element) {
            sandbox.showModal('layouteditor', {});
        });

        $('#navbar-fixed-bottom-download-panel-button').on('click', function(element) {
            var id = sandbox.focusState.panel;
            sandbox.get('panel', {id: id}, function(resourceList) {
                if (resourceList.length === 1) {
                    sandbox.showModal('downloadpanel', {
                        resource: resourceList[0]
                    });
                }
            });
        });

        $('#navbar-fixed-bottom-edit-dataset-button').on('click', function(element) {
            sandbox.displayEditResourceDialog('dataset', sandbox.focusState.dataset);
        });

        $('#navbar-fixed-bottom-create-event-button').on('click', function(element) {
            sandbox.showModal('modifyresource', {
                resourceAction: 'create',
                resourceType: 'event',
                resource: {//defaults
                    startTime: sandbox.focusState.startTime,
                    endTime: sandbox.focusState.endTime,
                    datasetId: sandbox.focusState.dataset
                }
            });

        });
        $('[data-name=navbar-fixed-bottom-zoom-button]').on('click', function() {
            var zoom = sandbox.calculateZoom($(this).data('direction'),
                    sandbox.focusState.minStartTime,
                    sandbox.focusState.maxEndTime,
                    sandbox.focusState.startTime,
                    sandbox.focusState.endTime
                    );
            sandbox.resourceFocused('dataset', sandbox.focusState.dataset,
                    zoom.startTime, zoom.endTime);
        });
    });
});
