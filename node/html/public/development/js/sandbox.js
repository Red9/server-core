define(['vendor/jquery', 'vendor/handlebars',
    'vendor/async',
    'tileframe',
    'customHandlebarsHelpers',
    'sandbox/sandbox.history',
    'sandbox/sandbox.utilities',
    'sandbox/sandbox.convenience',
    'sandbox/sandbox.database',
    'sandbox/sandbox.events'
], function($, Handlebars, async, tileFrame, chh,
        sandboxHistory, sandboxUtilities, sandboxConvenience,
        sandboxDatabase, sandboxEvents) {
    var sandbox = {
        currentUser: '',
        apiUrl: '',
        actionUrl: '',
        tileId: 0,
        focusState: {
            dataset: '', // ID
            panel: '',
            event: '',
            minStartTime: -1,
            maxEndTime: -1,
            startTime: -1,
            endTime: -1,
            panelBody: {}
        },
        init: function() {
            sandboxHistory(sandbox);
            sandboxUtilities(sandbox);
            sandboxConvenience(sandbox);
            sandboxDatabase(sandbox);
            sandboxEvents(sandbox);

            sandbox.actionUrl = $('#page_parameters').data('actionurl');
            sandbox.apiUrl = $('#page_parameters').data('apiurl');
            sandbox.currentUser = $('#page_parameters').data('currentuser');


            sandbox.setPageTitle('Red9 Sensor');


            sandbox.div = $('#sandboxContentDiv');

            sandbox.get('user', {id: sandbox.currentUser}, function(users) {
                if (users.length !== 1) {
                    alert('Error: incorrect user ID "' + sandbox.currentUser + '". Page failure.');
                    return;
                }

                sandbox.currentUser = users[0];
                var normalizedPath = sandbox.getCurrentHistory().normalizedPath;
                var preferredLayoutId = sandbox.currentUser.preferredLayout[normalizedPath];

                if (typeof preferredLayoutId === 'undefined') {
                    alert('Warning: you must set your preferred layout. See your user profile page.');
                    return;
                }

                sandbox.get('layout', {id: preferredLayoutId},
                function(layouts) {
                    if (layouts.length === 0) {
                        alert('Error: no layouts! Page failure.');
                        return;
                    }
                    var finalLayout = layouts[0].layout;
                    async.eachSeries(finalLayout, sandbox.createFlatTile,
                            function(err) {
                                // First time, so force a history "change"
                                sandbox.forceHistoryLoad();
                            });
                });
            });


        },
        createFlatTile: function(tile, doneCallback) {
            tileFrame(sandbox, sandbox.tileId++, sandbox.div, 'flat',
                    tile.class, tile.configuration, doneCallback);
        },
        currentModal: undefined,
        showModal: function(type, parameters) {
            // If modal is already shown, dismiss it first.
            if (typeof sandbox.currentModal !== 'undefined') {
                sandbox.currentModal.destructor();
            }

            sandbox.currentModal = tileFrame(sandbox, sandbox.tileId++,
                    $('#modal_div'), 'modal', type, parameters, function() {
            });

        },
        templates: {},
        requestTemplate: function(name, callback) {
            if (typeof sandbox.templates[name] === 'undefined') {
                $.ajax({
                    url: '/templates/' + name + '.html',
                    datatype: 'text/javascript',
                    success: function(response, status, jqXHR) {
                        sandbox.templates[name] = Handlebars.compile(response);
                        callback(sandbox.templates[name]);
                    }

                });
            } else {
                callback(sandbox.templates[name]);
            }
        },
        setPageTitle: function(newTitle) {
            $(document).attr('title', newTitle);
            $('#footer-page-title').text(newTitle);
        }
    };
    return sandbox;
});