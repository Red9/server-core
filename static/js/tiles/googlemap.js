define(['vendor/jquery', 'vendor/underscore', 'vendor/moment'], function($, _, moment) {
    /**
     * List of Google Map Icons:
     * http://www.lass.it/Web/viewer.aspx?id=4
     * http://ex-ample.blogspot.com/2011/08/all-url-of-markers-used-by-google-maps.html
     * https://sites.google.com/site/gmapsdevelopment/
     */

    function googleMap(sandbox, tile, configuration, doneCallback) {

        var map;
        var mapFeatures;
        var videoMarker;
        var hoverMarker;

        function init() {
            mapFeatures = [];
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-video-time', videoTime);
            tile.addListener('totalState-hover-time', hoverTime);
            tile.setTitle('map');

            sandbox.requestTemplate('googlemap', function(template) {
                tile.place.html(template({}));

                var mapOptions = {
                    zoom: 3,
                    center: new google.maps.LatLng(42.228147, -103.541772),
                    mapTypeId: google.maps.MapTypeId.SATELLITE,
                    scrollwheel: false
                };

                map = new google.maps.Map(
                        $('.google-map-canvas', tile.place)[0], mapOptions);


                doneCallback();
            });
        }

        function resourceFocused(event, parameter) {
            if (typeof sandbox.focusState.panel !== 'undefined') {
                updateWithNewPanel(sandbox.focusState.panel);
            }
        }
        function hoverTime(event, parameter) {
            showMarker(hoverMarker, parameter.hoverTime);
        }

        function videoTime(event, parameter) {
            showMarker(videoMarker, parameter.videoTime);
        }

        function showMarker(marker, time) {
            var panel = sandbox.focusState.panel.panel;
            for (var i = 1; i < panel.time.length; i++) {
                if (panel.time[i - 1] <= time
                        && time <= panel.time[i]) {
                    // Time is in between the two points.
                    // Choose lower point.
                    var latitude = panel['gps:latitude'][i];
                    var longitude = panel['gps:longitude'][i];
                    if (isNaN(latitude) === true || isNaN(longitude) === true
                            || latitude === null || longitude === null) {
                        // Not a valid point
                        return;
                    } else {
                        marker.setPosition(
                                new google.maps.LatLng(latitude, longitude));
                    }
                }
            }
        }

        function createPathGroups(panel) {
            // Partition the points into contiguous sets
            var pathGroups = [];
            var previousPointValid = false;

            if (_.has(panel.panel, 'gps:latitude') === false
                    || _.has(panel.panel, 'gps:longitude') === false) {
                return pathGroups;
            }

            _.each(panel.panel.time, function(time, rowIndex) {
                var latitude = panel.panel['gps:latitude'][rowIndex];
                var longitude = panel.panel['gps:longitude'][rowIndex];

                if (isNaN(latitude) === true || isNaN(longitude) === true
                        || latitude === null || longitude === null) {
                    // Not a valid point
                    previousPointValid = false;
                    return;
                } else {
                    // Valid point
                    if (previousPointValid === false) {
                        pathGroups.push([]);
                        previousPointValid = true;
                    }

                    pathGroups[pathGroups.length - 1].push({
                        time: time,
                        point: new google.maps.LatLng(latitude, longitude)
                    });
                }
            });

            return pathGroups;

        }

        /**
         * @param {type} bounds
         * @param {type} list array of objects with keys time (timestamp) and point (google maps LatLng)
         * @returns {undefined}
         */
        function createMapFeaturesFromPoints(bounds, list) {

            var linePoints = [];

            // Create small markers indicating the individual points
            _.each(list, function(t) {
                mapFeatures.push(new google.maps.Marker({
                    title: moment(t.time).format("h:mm:ss.SSSa")
                            + "\n(" + t.point.lat().toFixed(4)
                            + ", " + t.point.lng().toFixed(4) + ")",
                    map: map,
                    flat: true, // May help performance, but haven't measured.
                    position: t.point,
                    icon: 'https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png'
                }));
                bounds.extend(t.point);
                linePoints.push(t.point);
            });

            // Create a line for the points.

            // Define a symbol using a predefined path (an arrow)
            // supplied by the Google Maps JavaScript API.
            var lineSymbol = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeOpacity: 0.75,
                strokeColor: '#FFFFFF'
            };

            // A line has to have at least two points
            if (linePoints.length > 1) {
                var repeat = '70%';

                if (linePoints.length > 500) {
                    repeat = '10%';
                } else if (linePoints.length > 250) {
                    repeat = '20%';
                } else if (linePoints.lenth > 100) {
                    repeat = '35%';
                }

                mapFeatures.push(new google.maps.Polyline({
                    map: map,
                    path: linePoints,
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2,
                    icons: [{
                            icon: lineSymbol,
                            repeat: repeat
                        }]
                }));
            }
        }


        function createMissingSegmentFromPoints(start, finish) {
            mapFeatures.push(new google.maps.Polyline({
                map: map,
                path: [start, finish],
                geodesic: true,
                strokeColor: '#A9A9A9',
                strokeOpacity: 0.65,
                strokeWeight: 2
            }));
        }

        function clearMapFeatures() {
            if (typeof mapFeatures !== 'undefined') {
                _.each(mapFeatures, function(feature) {
                    feature.setMap(null);
                });
            }
            mapFeatures = [];
        }

        function updateWithNewPanel(panel) {
            clearMapFeatures();

            var pathGroups = createPathGroups(panel);

            if (pathGroups.length > 0) { // at least 1 GPS point defined
                if (typeof videoMarker === 'undefined') {
                    videoMarker = new google.maps.Marker({
                        map: map,
                        title: 'Video Time',
                        icon: 'http://maps.google.com/mapfiles/marker_greyV.png',
                        flat: true,
                        zIndex: 999
                    });
                } else {
                    videoMarker.setPosition();
                }
                if (typeof hoverMarker === 'undefined') {
                    hoverMarker = new google.maps.Marker({
                        map: map,
                        title: 'Hover Time',
                        icon: 'http://maps.google.com/mapfiles/marker_orangeH.png',
                        flat: true,
                        zIndex: 1000
                    });
                } else {
                    hoverMarker.setPosition();
                }


                var bounds = new google.maps.LatLngBounds();
                _.each(pathGroups, function(list, index) {
                    createMapFeaturesFromPoints(bounds, list);
                    if (index !== 0) {
                        createMissingSegmentFromPoints(
                                _.last(pathGroups[index - 1]).point,
                                _.first(list).point
                                );
                    }
                });

                mapFeatures.push(new google.maps.Marker({
                    position: pathGroups[0][0].point,
                    map: map,
                    title: 'Start',
                    icon: 'http://maps.google.com/mapfiles/dd-start.png'
                }));


                mapFeatures.push(new google.maps.Marker({
                    position: _.last(_.last(pathGroups)).point,
                    map: map,
                    title: 'End',
                    icon: 'http://maps.google.com/mapfiles/dd-end.png'
                }));

                map.fitBounds(bounds);

                // Show if there is gps data
                tile.setVisible(true);

            } else {
                var point = new google.maps.LatLng(32.149989, -110.835842);
                map.setCenter(point);
                map.setZoom(15);

                // Hide if there's no gps data
                tile.setVisible(false);
            }
        }

        function destructor() {
            clearMapFeatures();
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = map
                    = mapFeatures
                    = videoMarker
                    = hoverMarker
                    = null;

        }

        init();
        return {
            destructor: destructor
        };

    }

    return googleMap;
});

 