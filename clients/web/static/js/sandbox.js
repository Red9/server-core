define(['vendor/jquery', 'vendor/underscore', 'vendor/handlebars',
    'vendor/async',
    'tileframe',
    'customHandlebarsHelpers',
    'sandbox/sandbox.history',
    'sandbox/sandbox.utilities',
    'sandbox/sandbox.convenience',
    'sandbox/sandbox.database',
    'sandbox/sandbox.events',
    'sandbox/sandbox.action'
], function($, _, Handlebars, async, tileFrame, chh,
        sandboxHistory, sandboxUtilities, sandboxConvenience,
        sandboxDatabase, sandboxEvents, sandboxAction) {
    var sandbox = {
        currentUser: '', // User object
        apiUrl: '',
        actionUrl: '',
        tileId: 0,
        focusState: {
            dataset: undefined, // ID
            event: undefined,
            minStartTime: -1,
            maxEndTime: -1,
            startTime: -1,
            endTime: -1,
            panel: undefined
        },
        buildSandbox: function() {
            if (sandbox.built !== true) {
                // AJAX: always send session cookie with requests.
                $.ajaxSetup({
                    xhrFields: {
                        withCredentials: true
                    }
                });

                sandbox.actionUrl = $('#page_parameters').data('actionurl');
                sandbox.apiUrl = $('#page_parameters').data('apiurl');
                sandbox.currentUser = $('#page_parameters').data('currentuser');

                sandboxHistory(sandbox);
                sandboxUtilities(sandbox);
                sandboxConvenience(sandbox);
                sandboxDatabase(sandbox);
                sandboxEvents(sandbox);
                sandboxAction(sandbox);

                sandbox.built = true;
            }
        },
        init: function() {
            sandbox.buildSandbox();

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
        tiles: [],
        createFlatTile: function(tile, doneCallback, myDiv) {
            if (typeof myDiv === 'undefined') {
                myDiv = sandbox.div;
            }

            if (_.isArray(tile) === true) {
                if (tile.length > 4) {
                    alert('ERROR: Too many tiles!');
                }
                var columns = 12 / tile.length;

                var place = $('<div class="row"></div>');
                myDiv.append(place);
                async.eachSeries(tile, function(t, dc) {

                    var tp = $('<div class="col-md-' + columns + '"></div>');
                    place.append(tp);
                    sandbox.createFlatTile(t, dc, tp);

                }, function() {
                    doneCallback();
                });




            } else {
                sandbox.tiles.push(tileFrame(sandbox, sandbox.tileId++, myDiv, 'flat',
                        tile.class, tile.configuration, doneCallback));
            }
        },
        clearTiles: function() {
            _.each(sandbox.tiles, function(tile) {
                tile.destructor();
            });
            sandbox.tiles = [];
            sandbox.focusState = {
                dataset: undefined, // ID
                event: undefined,
                minStartTime: -1,
                maxEndTime: -1,
                startTime: -1,
                endTime: -1,
                panel: undefined
            };

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
                    url: '/static/templates/' + name + '.html',
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