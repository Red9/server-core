var site = {
  //props
  urls: {
    searchDataset: '/dataset/',
    searchEvent: '/event/'
  },
  templates: {},
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
    var context = $('#filterForm .filter-item:not(.inactive)');
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
    var url = this.urls.searchDataset;
    if ($('#type-event').is(':checked')) {
      url = this.urls.searchEvent;
    }
    var self = this;
    //TODO: remove this line (hardcoded for now)
    url = '/noop/';
    $.post(url, this.getSearchParams(), function (response) {
      //TODO: remove this to use the values from the post response (hardcoded for now)
      response = [{
        "id": "b819fe57-b825-4267-8b27-95ff4595d3e0",
        "url": "/api/v1/dataset/b819fe57-b825-4267-8b27-95ff4595d3e0",
        "name": "My Cool Dataset",
        "create_time": 52350723,
        "create_user": "b819fe57-b825-4267-8b27-95ff4595d3e0",
        "start_time": 5273072,
        "end_time": 5357235,
        "type":"dataset"
      }];
      response.push(response[0]);
      if (!self.templates.results) {
        self.templates.results = Handlebars.compile($('#tmplResults').html());
      }
      $('#containerResults').html(self.templates.results(response));
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
      title: title,
      draggable: true
    });
    marker.setMap(map);
    google.maps.event.addListener(marker, 'dragend', function() {
      var position = marker.getPosition();
      map.setCenter(position);
      $(targetLatLng).val(position.lat() + ',' + position.lng());
      geocoder.geocode({'latLng': position}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK && results[1]) {
          $(targetName)
            .val(results[1].formatted_address)
            .text(results[1].formatted_address);
        }
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