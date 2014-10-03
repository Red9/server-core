require(['sandbox', 'vendor/jquery', 'vendor/underscore', 'vendor/bootstrap'], function(sandbox, $, _) {

    sandbox.buildSandbox();
    sandbox.requestTemplate('spa.bottombar.panel', function(template) {

        $('#fixedBottomBarDiv').html(template({}));
        sandbox.init();

        $('#navbar-fixed-bottom-layout-button').on('click', function(element) {
            sandbox.showModal('layouteditor', {});
        });

        $('#navbar-fixed-bottom-event-detection-button').on('click', function(element) {
            sandbox.showModal('eventdetection', {});
        });

        $('#navbar-fixed-bottom-view-summary-statistics-button').on('click', function(element) {
            sandbox.showModal('summarystatistics', {});
        });

        $('#navbar-fixed-bottom-comments-button').on('click', function(element) {
            sandbox.showModal('comments', {});
        });

        $(sandbox).on('totalState-resource-focused', function(event, parameters) {
            // Update with the number of comments
            sandbox.get('comment', {resourceType: 'dataset', resource: sandbox.getCurrentDatasetId()}, function(commentList) {
                var length = commentList.length === 0 ? '' : commentList.length;
                $('#navbar-fixed-bottom-comments-button').parent().find('.badge').text(length);
            });
        });

        $('#navbar-fixed-bottom-download-panel-button').on('click', function(element) {
            var id = sandbox.focusState.panel.id;
            sandbox.get('panel', {id: id}, function(resourceList) {
                if (resourceList.length === 1) {
                    sandbox.showModal('downloadpanel', {
                        resource: resourceList[0]
                    });
                }
            });
        });

        $('#navbar-fixed-bottom-dataset-properties-button').on('click', function(element) {
            sandbox.showModal('resourcedetails', {
                type: 'dataset',
                id: sandbox.getCurrentDatasetId()
            });
        });

        $('#navbar-fixed-bottom-edit-dataset-button').on('click', function(element) {
            sandbox.displayEditResourceDialog('dataset', sandbox.getCurrentDatasetId());
        });

        $('#navbar-fixed-bottom-create-event-button').on('click', function(element) {
            sandbox.showModal('modifyresource', {
                resourceAction: 'create',
                resourceType: 'event',
                resource: {//defaults
                    startTime: sandbox.focusState.startTime,
                    endTime: sandbox.focusState.endTime,
                    datasetId: sandbox.getCurrentDatasetId()
                }
            });

        });
        $('[data-name=navbar-fixed-bottom-zoom-button]').on('click', function() {
            var zoom = sandbox.calculateZoom($(this).data('direction'));
            sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDatasetId(),
                    zoom.startTime, zoom.endTime);
        });
    });
});
