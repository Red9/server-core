



function GoogleMap(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;

    var startTime = dataset.headPanel.startTime;
    var endTime = dataset.headPanel.endTime;



    var classInstance = this;


    $('#' + classInstance.id + '_container').load(
            '/lens/googlemap?id=' + classInstance.id,
            function() {

                //console.log("Done loading...");
                var mapOptions = {
                    zoom: 3,
                    center: new google.maps.LatLng(42.228147, -103.541772),
                    mapTypeId: google.maps.MapTypeId.SATELLITE
                };

                classInstance.map = new google.maps.Map(
                        document.getElementById(classInstance.id + 'map-canvas'),
                        mapOptions);

                classInstance.parameters.requestPanelFunction(startTime,
                        endTime,
                        [
                            'gps:latitude',
                            'gps:longitude'

                        ],
                        $.proxy(classInstance.updateWithNewPanel, classInstance)
                        );
            });

    setTimeout(function() {

    }, 1000);

}


//-----------------------------------------------------------------------------
// Private
//-----------------------------------------------------------------------------
GoogleMap.prototype.updateWithNewPanel = function(panel) {

    // Check and delete any existing points/lines.
    if (typeof this.discretePoints !== 'undefined') {
        _.each(this.discretePoints, function(point) {
            point.setMap(null);
        });
    }
    if (typeof this.path !== 'undefined') {
        this.path.setMap(null);
    }
    
    
    var latitudeIndex = $.inArray('gps:latitude', panel.labels);
    var longitudeIndex = $.inArray('gps:longitude', panel.labels);
    var timeIndex = 0;

    var linePoints = [];
    var discretePoints = [];

    var bounds = new google.maps.LatLngBounds();

    var classInstance = this;
    

        // Only include rows that exist.
        // TODO(SRLM): It would be better to indicate this somehow (gaps in the
        // line? Red sections?)



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
        bounds.extend(point);

        linePoints.push(point);

        var marker = new google.maps.Marker({
            title: moment(row[timeIndex]).format("h:mm:ss.SSSa")
                    + "\n(" + point.lat().toFixed(4)
                    + ", " + point.lng().toFixed(4) + ")",
            map: classInstance.map,
            flat: true, // May help performance, but haven't measured.
            position: point,
            icon: 'https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png'
        });
        discretePoints.push(marker);
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

    this.discretePoints = discretePoints;
    this.path.setMap(this.map);
    this.map.fitBounds(bounds);



};

//-----------------------------------------------------------------------------
// Public
//-----------------------------------------------------------------------------


GoogleMap.prototype.setRange = function(startTime, endTime) {
    this.parameters.requestPanelFunction(
            startTime, endTime,
            [
                'gps:latitude',
                'gps:longitude'

            ],
            $.proxy(this.updateWithNewPanel, this)
            );

};

GoogleMap.prototype.setHover = function(time) {

};

GoogleMap.prototype.setMarkers = function(markerATime, markerBTime) {

};

GoogleMap.prototype.setPlaytime = function(time) {

};

GoogleMap.prototype.getConfiguration = function() {

};

