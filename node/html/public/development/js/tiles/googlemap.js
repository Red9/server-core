function googleMap(myPlace, configuration, doneCallback) {
    var self = this;

    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));

    sandbox.requestTemplate('googlemap', function(template) {
        myPlace.html(template({}));

        var mapOptions = {
            zoom: 3,
            center: new google.maps.LatLng(42.228147, -103.541772),
            mapTypeId: google.maps.MapTypeId.SATELLITE
        };

        self.map = new google.maps.Map($('.google-map-canvas', myPlace)[0], mapOptions);


        doneCallback();
    });
}

googleMap.prototype.resourceFocused = function(event, parameter) {
    if (typeof parameter.panel !== 'undefined') {
        this.updateWithNewPanel(parameter.panel);
    }
};


googleMap.prototype.createPathGroups = function(panel) {

    var latitudeIndex = $.inArray('gps:latitude', panel.labels);
    var longitudeIndex = $.inArray('gps:longitude', panel.labels);
    var timeIndex = 0;

    // Partition the points into contiguous sets
    var pathGroups = [];
    var previousPointValid = false;
    _.each(panel.values, function(row, index) {
        // The panel is spliced, so let's only map the values within the 
        // core range.
        if (row[timeIndex] < panel.startTime || row[timeIndex] > panel.endTime) {
            return;
        }


        var latitude;
        if (_.isArray(row[latitudeIndex]) === true) { // Min/avg/max array
            latitude = row[latitudeIndex][1];
        } else {
            latitude = row[latitudeIndex];
        }

        var longitude;
        if (_.isArray(row[longitudeIndex]) === true) { // Min/avg/max array
            longitude = row[longitudeIndex][1];
        } else {
            longitude = row[longitudeIndex];
        }

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
                time: row[timeIndex],
                point: new google.maps.LatLng(latitude, longitude)
            });
        }
    });

    return pathGroups;

};

/**
 * 
 * @param {type} list array of objects with keys time (timestamp) and point (google maps LatLng)
 * @returns {undefined}
 */
googleMap.prototype.createMapFeaturesFromPoints = function(bounds, list) {
    var self = this;

    var linePoints = [];

    // Create small markers indicating the individual points
    _.each(list, function(t) {
        self.mapFeatures.push(new google.maps.Marker({
            title: moment(t.time).format("h:mm:ss.SSSa")
                    + "\n(" + t.point.lat().toFixed(4)
                    + ", " + t.point.lng().toFixed(4) + ")",
            map: self.map,
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

        self.mapFeatures.push(new google.maps.Polyline({
            map: self.map,
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
};


googleMap.prototype.createMissingSegmentFromPoints = function(start, finish) {

    this.mapFeatures.push(new google.maps.Polyline({
        map: this.map,
        path: [start, finish],
        geodesic: true,
        strokeColor: '#A9A9A9',
        strokeOpacity: 0.65,
        strokeWeight: 2
    }));
};

googleMap.prototype.updateWithNewPanel = function(panel) {
    if (typeof this.mapFeatures !== 'undefined') {
        _.each(this.mapFeatures, function(feature) {
            feature.setMap(null);
        });
    }
    this.mapFeatures = [];

    var pathGroups = this.createPathGroups(panel);

    var self = this;

    if (pathGroups.length > 0) { // at least 1 GPS point defined
        var bounds = new google.maps.LatLngBounds();
        _.each(pathGroups, function(list, index) {
            $.proxy(self.createMapFeaturesFromPoints(bounds, list), self);
            if (index !== 0) {
                $.proxy(self.createMissingSegmentFromPoints(
                        _.last(pathGroups[index - 1]).point,
                        _.first(list).point
                        ), self);
            }
        });



        this.mapFeatures.push(new google.maps.Marker({
            position: pathGroups[0][0].point,
            map: self.map,
            title: 'Start',
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }));


        this.mapFeatures.push(new google.maps.Marker({
            position: _.last(_.last(pathGroups)).point,
            map: self.map,
            title: 'End',
            icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }));

        this.map.fitBounds(bounds);

    }else{
        console.log('No GPS in this dataset');
        var point = new google.maps.LatLng(32.149989, -110.835842);
        this.map.setCenter(point);
        this.map.setZoom(15);
    }


};

googleMap.prototype.updateWithNewPanelOld = function(panel) {

    // Check and delete any existing points/lines.
    if (typeof this.discretePoints !== 'undefined') {
        _.each(this.discretePoints, function(point) {
            point.setMap(null);
        });
    }
    if (typeof this.path !== 'undefined') {
        this.path.setMap(null);
    }
    if (typeof this.pathList !== 'undefined') {
        _.each(this.pathList, function(path) {
            path.setMap(null);
        });
    }

    if (typeof this.startMarker !== 'undefined') {
        this.startMarker.setMap(null);
    }
    if (typeof this.endMarker !== 'undefined') {
        this.endMarker.setMap(null);
    }



    var latitudeIndex = $.inArray('gps:latitude', panel.labels);
    var longitudeIndex = $.inArray('gps:longitude', panel.labels);
    var timeIndex = 0;

    var linePoints = [];
    var bounds = new google.maps.LatLngBounds();
    var self = this;
    self.discretePoints = [];

    var firstPoint = true;

    _.each(panel.values, function(row, index) {

        // Only include rows that exist.
        // TODO(SRLM): It would be better to indicate this somehow (gaps in the
        // line? Red sections?)

        // The panel is spliced, so let's only map the values within the 
        // core range.
        if (row[timeIndex] < panel.startTime || row[timeIndex] > panel.endTime) {
            return;
        }


        var latitude;
        if (_.isArray(row[latitudeIndex]) === true) { // Min/avg/max array
            latitude = row[latitudeIndex][1];
        } else {
            latitude = row[latitudeIndex];
        }

        var longitude;
        if (_.isArray(row[longitudeIndex]) === true) { // Min/avg/max array
            longitude = row[longitudeIndex][1];
        } else {
            longitude = row[longitudeIndex];
        }

        if (isNaN(latitude) === true || isNaN(longitude) === true
                || latitude === null || longitude === null) {
            return;
        }



        var point = new google.maps.LatLng(latitude, longitude);

        if (firstPoint === true) {
            firstPoint = false;
            self.startMarker = new google.maps.Marker({
                position: point,
                map: self.map,
                title: 'Start',
                icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            });
        } else if (index === panel.values.length - 1) {
            self.endMarker = new google.maps.Marker({
                position: point,
                map: self.map,
                title: 'End',
                icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });
        }

        bounds.extend(point);

        linePoints.push(point);

        var marker = new google.maps.Marker({
            title: moment(row[timeIndex]).format("h:mm:ss.SSSa")
                    + "\n(" + point.lat().toFixed(4)
                    + ", " + point.lng().toFixed(4) + ")",
            map: self.map,
            flat: true, // May help performance, but haven't measured.
            position: point,
            icon: 'https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png'
        });
        self.discretePoints.push(marker);
    });

    ///---------------

    // Define a symbol using a predefined path (an arrow)
    // supplied by the Google Maps JavaScript API.
    var lineSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 3,
        strokeOpacity: 0.75,
        strokeColor: '#FFFFFF'
    };

    this.path = new google.maps.Polyline({
        map: this.map,
        path: linePoints,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        icons: [{
                icon: lineSymbol,
                repeat: '10%'
            }]
    });

    this.path.setMap(this.map);
    this.map.fitBounds(bounds);
};

 