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
  searchPageSize: 20,
  templates: {},
  urls: {
    apiPath: 'Nothing Here', // Dynmaically set
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
    var context = $('#filter-form .filter-item:not(.inactive):not(.ignore)');
    var params = {simpleoutput: 1};
    var self = this;
    $(' input, select', context).not(':radio, :checkbox').each(function () {
      var element = $(this);
      var key = element.attr('id');
      if (element.attr('name')) {
        key = element.attr('name');
      }
      if (element.val()) {
        params[key] = element.val();
      }
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
    $('.slider', context).each(function () {
      var element = $(this);
      if (!element.data('initialized')) {
        return;
      }
      var values = element.slider('values');
      if (values.length === 2 && values[1]) {
        //unit conversion (ie: mile to meter)
        var convert = function (value) {return value;};
        if (element.data('tovalue')) {
          convert = self[element.data('tovalue')];
        }
        params[element.data('name') + '.more'] = convert(values[0]);
        params[element.data('name') + '.less'] = convert(values[1]);
      }
    });
    return params;
  },
  clearSearchFilter: function () {
    location.hash = '#';
    var context = $('#filter-form .filter-item:not(.inactive)');
    $(' input, select', context).not(':radio, :checkbox').val(null);
    $('#additional-filters-container').empty();
    $('#location-remove').click();
    $('.slider', context).each(function () {
      var element = $(this);
      if (!element.data('initialized')) {
        return;
      }
      element.slider('values', [0, 0]);
    });
    this.search();
  },
  search: function () {
    var url = this.urls.apiPath + this.urls.searchDataset;
    if ($('#type-event').is(':checked')) {
      url = this.urls.apiPath + this.urls.searchEvent;
    }
    var self = this;
    $.get(url, this.getSearchParams(), function (response) {
      self.results = response.sort(site.sortBy('startTime', 'desc'));
      self.showResults();
    });
  },
  showResults: function (page) {
    var adaptedResults = {items: this.results};
    if (adaptedResults.items.length > this.searchPageSize) {
      var paging = {
        length: Math.ceil(adaptedResults.items.length / this.searchPageSize),
        current: page ||0
      };
      adaptedResults.paging = paging;
      adaptedResults.items = adaptedResults.items.slice(
        paging.current * this.searchPageSize,
        (paging.current+1) * this.searchPageSize);
    }
    if (!this.templates.results) {
      this.templates.results = Handlebars.compile($('#tmpl-results').html());
    }
    $('#container-results').html(this.templates.results(adaptedResults));
  },
  setMap: function(lat, lng, zoom, selectCallback) {
    var self = this;
    var position = new google.maps.LatLng(lat, lng);
    var geocoder = new google.maps.Geocoder();
    var mapOptions = {
      center: position,
      zoom: zoom
    };
    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    var marker = new google.maps.Marker({
      position: position,
      draggable: true
    });
    this.mapContext = {map: map, marker: marker};

    google.maps.event.addListener(map, 'click', function(event) {
      if (!marker.getMap()) {
        marker.setPosition(event.latLng);
        marker.setMap(map);
        markerPositionChanged();
      }
    });
    google.maps.event.addListener(marker, 'dragend', markerPositionChanged);

    function markerPositionChanged() {
      var position = marker.getPosition();
      map.setCenter(position);
      selectCallback(position.lat(), position.lng());
      geocoder.geocode({'latLng': position}, function(results, status) {
        var locationName = self.adapter.address();
        if (status === google.maps.GeocoderStatus.OK && results[1]) {
          locationName = self.adapter.address(results[1].address_components);
        }
        selectCallback(position.lat(), position.lng(), locationName);
      });
    }
  },
  /**
   * Removes the marker from the map
   */
  clearMap: function () {
    if (!this.mapContext) {
      return;
    }
    this.mapContext.marker.setMap(null);
  },
  setSlider: function (context, options) {
      var sliderElement = $(".slider", context);
      function slideChange(event, ui) {
        $('.slider-label', context).html(ui.values[0] + ' to ' + ui.values[1] + ' ' + options.units);
      }
      sliderElement.slider({
          range: true,
          step: options.step || 1,
          min: options.min || 0,
          max: options.max,
          values: [0, 0],
          slide: slideChange,
          change: slideChange
      }).data('initialized', true).on('custom', function (){alert('custom');});
  },
  /**
   * Returns a date in YYYY-MM-DD format or the string Today and Yesterday
   * @param value Milliseconds
   */
  toDateString: function (value) {
    if (!value) {
      return null;
    }

    var date = new Date(value);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(today.getDate() - 1);
    if (date > today) {
      return "Today";
    }
    else if (date > yesterday) {
      return "Yesterday";
    }
    return date.getFullYear() + '-' + this.padZeros(date.getMonth()+1, 2) + '-' + this.padZeros(date.getDay(), 2);
  },
  padZeros: function (value, length) {
    return ('000000' + value).substr(-length);
  },
  mileToMeter: function (value) {
    return parseFloat(value) / 0.00062137;
  },
  sortBy: function (name, order) {
    if (order !== 'desc') {
      return function (a, b) {
        return a[name] - b[name];
      };
    }
    else
    {
      return function (a, b) {
        return b[name] - a[name];
      };
    }
  }
};
if (Handlebars) {
  Handlebars.registerHelper('toDateString', site.toDateString.bind(site));

  Handlebars.registerHelper('pager', function(context, options) {
    if (!context) {
      return null;
    }
    var builder = [];
    var onclick = (options.hash && options.hash['onclick']) || '';
    function getOnClick(value) {
      return onclick.replace(/\:0\:/g, value) + ';return false;';
    }
    builder.push('<ul class="pagination">');
    if (context.current > 0) {
      builder.push('<li><a href="#" onclick="' + getOnClick(context.current-1) + '">&laquo;</a></li>');
    }
    else {
      builder.push('<li class="disabled"><span>&laquo;</span></li>');
    }
    for(var i = 0; i < context.length; i++) {
      builder.push('<li');
      if (i === context.current) {
        builder.push(' class="active"');
      }
      builder.push('><a href="#" onclick="');
      builder.push(getOnClick(i));
      builder.push('">');
      builder.push(i+1);
      builder.push('</a></li>');
    }
    if (context.current < context.length - 1) {
      builder.push('<li><a href="#' + getOnClick(context.current+1) + '">&raquo;</a></li>');
    }
    else {
      builder.push('<li class="disabled"><span>&raquo;</span></li>');
    }
    builder.push('</ul');
    return builder.join('');
});
}
