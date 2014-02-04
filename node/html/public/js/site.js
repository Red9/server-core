var site = {
  //props
  adapter: {
    //adapts a google address into an app address
    address: function (components) {
      if (!components || !components.length) {
        return 'Somewhere';
      }
      //relevant parts
      var parts = {
        'locality': null,
        'administrative_area_level_2': null,
        'administrative_area_level_1': null,
        'country': null
      };
      components.forEach(function (item) {
        var type = item.types[0];
        if (type && parts[type] === null) {
          parts[type] = item.short_name;
        }
      });
      return $.grep([
        (parts.locality || parts.administrative_area_level_2),
        parts.administrative_area_level_1,
        parts.country
      ], Boolean).join(', ');
    }
  },
  templates: {},
  urls: {
    apiPath: 'http://api.localhost:8081',
    searchDataset: '/dataset/',
    searchEvent: '/event/'
  },
  //methods
  deleteDataset: function(id) {
    $.ajax(
      "/api/dataset/" + id,
      {type: "delete"}
    ).done(function() {
      var row = $("#dataset_list_row_" + id);
      row.addClass('danger');
      row.hide("slow", function() {
        oTable.fnDeleteRow(row[0]);
      });
    }).fail(function() {
      alert("Internal Error: could not delete dataset. Please notify a sysadmin.");
    });
  },
  getSearchParams: function () {
    var context = $('#filter-form .filter-item:not(.inactive)');
    var params = {};
    $(' input, select', context).not(':radio, :checkbox').each(function () {
      var element = $(this);
      var key = element.attr('id');
      if (element.attr('name')) {
        key = element.attr('name');
      }
      if (element.val())
      params[key] = element.val();
    });
    $(':radio, :checkbox', context).filter(':checked').each(function () {
      var element = $(this);
      if (element.attr('name')) {
        //handle multiple values same name
        var value = params[element.attr('name')];
        if (!value) {
          value = element.val();
        }
        else {
          if (!$.isArray(value)) {
            value = [value];
          }
          value.push(element.val());
        }
        params[element.attr('name')] = value;
      }
    });
    return params;
  },
  search: function () {
    var url = this.urls.apiPath + this.urls.searchDataset;
    if ($('#type-event').is(':checked')) {
      url = this.urls.apiPath + this.urls.searchEvent;
    }
    var self = this;
    $.get(url, this.getSearchParams(), function (response) {
      if (!self.templates.results) {
        self.templates.results = Handlebars.compile($('#tmpl-results').html());
      }
      $('#container-results').html(self.templates.results(response));
    });
  },
  setMap: function(lat, lng, title, targetLatLng, targetName) {
    var position = new google.maps.LatLng(lat, lng);
    var geocoder = new google.maps.Geocoder();
    var mapOptions = {
      center: position,
      zoom: 8
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"),mapOptions);
    var marker = new google.maps.Marker({
      position: position,
      draggable: true
    });
    marker.setMap(map);
    var self = this;
    google.maps.event.addListener(marker, 'dragend', function() {
      var position = marker.getPosition();
      map.setCenter(position);
      $(targetLatLng).val(position.lat() + ',' + position.lng());
      geocoder.geocode({'latLng': position}, function(results, status) {
        var locationName = self.adapter.address();
        if (status == google.maps.GeocoderStatus.OK && results[1]) {
          locationName = self.adapter.address(results[1].address_components);
        }
        $(targetName)
          .val(locationName)
          .text(locationName);
      });
    });
  },
  toDateString: function (value) {
    //TODO: replace with real formatting
    return new Date(value).toString();
  }
};
if (Handlebars) {
  Handlebars.registerHelper('toDateString', site.toDateString);
}