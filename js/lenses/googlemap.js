



function GoogleMap(parameters, dataset, configuration) {
    this.id = parameters['id'];
    this.parameters = parameters;
    this.dataset = dataset;




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

                classInstance.parameters.requestPanelFunction(classInstance.dataset.start_time,
                        classInstance.dataset.end_time,
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

    _.each(panel.values, function(row) {

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


GoogleMap.prototype.setRange = function(minimumTime, maximumTime) {
    this.parameters.requestPanelFunction(
            minimumTime, maximumTime,
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



/*
 mapSpinner = new SRLM.EasySpinner($('#map_row'));
 
 var mapOptions = {
 zoom: 3,
 center: new google.maps.LatLng(42.228147, -103.541772),
 mapTypeId: google.maps.MapTypeId.SATELLITE
 };
 map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
 UpdateMap(start_time, end_time);
 
 // --------------------------------------------------
 // Google Map Functions
 // --------------------------------------------------
 
 // Google Maps stuff:
 var map;
 var path;
 var path_start_marker;
 var path_end_marker;
 var points;
 
 var mapSpinner;
 var mapQueueIdentifier = "GoogleMap";
 
 
 
 
 // Called at initialization and from within Dynamic Dygraphs.
 var UpdateMap = function(start, finish) {
 mapSpinner.showSpinner(true);
 var map_request_url = apiDomain + "/dataset/" + dataset_id + "/panel?axes=gps:latitude,gps:longitude&buckets=1000&format=json"
 + "&start_time=" + start + "&end_time=" + finish;
 
 AddToRequestQueue({request: map_request_url, callback: SetPathAndPointsOnMap, identifier: mapQueueIdentifier});
 };
 
 var SetPathAndPointsOnMap = function(data) {
 SetPointsOnMap(data.values);
 SetPathOnMap(data.values);
 mapSpinner.showSpinner(false);
 };
 
 /** Load the map with a line constructed from all of the points on the list.
 * 
 * @param {JSON} points The JSON array of points
 *//*
  var SetPathOnMap = function(newpoints) {
  // Clear prevous path, if any.
  if (typeof path !== "undefined") {
  path.setMap(null);
  }
  var lineCoordinates = [];
  
  var bounds = CreateLatLngArray(newpoints, lineCoordinates);
  
  // Define a symbol using a predefined path (an arrow)
  // supplied by the Google Maps JavaScript API.
  var lineSymbol = {
  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
  scale: 3,
  strokeOpacity: 0.75,
  strokeColor: '#FFFFFF'
  };
  
  path = new google.maps.Polyline({
  map: map,
  path: lineCoordinates,
  geodesic: true,
  strokeColor: '#FF0000',
  strokeOpacity: 1.0,
  strokeWeight: 2,
  icons: [{
  icon: lineSymbol,
  repeat: '10%'
  }]
  });
  
  path.setMap(map);
  map.fitBounds(bounds);
  };
  
  
  /** Load the map with all of the points in the list.
  * 
  * @param {JSON} newpoints The JSON array of points
  *//*
   var SetPointsOnMap = function(newpoints) {
   // If the points existed before be sure to get rid of them.
   if (typeof points !== "undefined") {
   for (var i = 0; i < points.length; i++) {
   points[i].setMap(null);
   }
   }
   points = [];
   
   var latlng = [];
   var bounds = CreateLatLngArray(newpoints, latlng);
   map.fitBounds(bounds);
   
   for (var i = 0; i < latlng.length; i++) {
   var marker = new google.maps.Marker({
   title: moment(parseFloat(newpoints[i][0])).format("h:mm:ss.SSSa")
   + "\n(" + latlng[i].lat().toFixed(4)
   + ", " + latlng[i].lng().toFixed(4) + ")",
   map: map,
   flat: true, // May help performance, but haven't measured.
   position: latlng[i],
   icon: 'https://maps.gstatic.com/intl/en_us/mapfiles/markers2/measle_blue.png'
   });
   
   points.push(marker);
   }
   };
   
   
   
   /*
   * 
   * @param {type} pointsList The JSON array of points.
   * @param {list[google.maps.LatLng]} coordinatesResultList The list of converted points (result)
   * @returns {google.maps.LatLngBounds} The bounds that these points fit into.
   *//*
    
    function CreateLatLngArray(pointsList, coordinatesResultList) {
    // Clear any previous points, and set some labels.
    if (typeof path_start_marker === "undefined") {
    path_start_marker = new google.maps.Marker({
    title: "Start",
    map: map,
    icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
    });
    }
    if (typeof path_end_marker === "undefined") {
    path_end_marker = new google.maps.Marker({
    title: "End",
    map: map,
    icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
    });
    }
    
    
    var bounds = new google.maps.LatLngBounds();
    var firstPoint = true;
    var point;
    
    for (var i = 0; i < pointsList.length; i++) {
    var lat = parseFloat(pointsList[i][1]);
    var long = parseFloat(pointsList[i][2]);
    if (isNaN(lat) === false && isNaN(long) === false) {
    point = new google.maps.LatLng(lat, long);
    coordinatesResultList.push(point);
    bounds.extend(point);
    
    if (firstPoint === true) {
    path_start_marker.setPosition(point);
    firstPoint = false;
    }
    }
    }
    
    path_end_marker.setPosition(point);
    return bounds;
    }
    
    */