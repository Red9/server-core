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
    apiPath: null, //Dynamically set
    searchDataset: '/dataset/',
    searchEvent: '/event/'
  },
  deleteChecked: function(resultType){
      console.log('Result type: ' + resultType);
      $('#result_tbody tr td #selectCheckbox').each(function(index, element){
          var checkbox = $(element);
          if(checkbox.prop('checked') === true){
              //console.log('Checked: ' + checkbox.attr('value'));
              site.deleteDataset(resultType, checkbox.attr('value'));
          }
          
      });
  },
  //methods
  deleteDataset: function(type, id) {
    var self = this;
    $.ajax(
      this.urls.apiPath + '/' + type + '/' + id,
      {type: "DELETE"}
    ).done(function() {
      var row = $("#result_row_" + id);
      row.addClass('danger');
      row.hide("slow", function() {
        // Remove from data master
        var index = self.getIndexInResults(id);
        // We're guarenteed to find the index, so don't need to bounds check.
        self.results.splice(index, 1);
        
        row.remove();
      });
    }).fail(function() {
      alert('Internal Error: could not delete ' + type + '. Please notify a sysadmin.');
    });
  },
  getIndexInResults: function(id){
      var i;
      for(i = 0; i < this.results.length; i++){
          if(this.results[i].id === id){
              return i;
          }
      }
      return -1;
  },
  getSearchParams: function () {
    var context = $('#filter-form .filter-item:not(.inactive):not(.ignore)');
    var params = {simpleoutput: 1};
    var self = this;
    $('input, select', context).not(':radio, :checkbox, .ignore').each(function () {
      var element = $(this);
      var key = element.attr('id');
      if (element.attr('name')) {
        key = element.attr('name');
      }
      if (element.val()) {
        params[key] = element.val();
        if ($.isArray(element.val())) {
          //separate values by commas
          params[key] = element.val().join(',');
        }
      }
    });
    $(':radio, :checkbox', context).not('.ignore').filter(':checked').each(function () {
      var element = $(this);
      if (element.attr('name')) {
        //handle multiple values same name
        var value = params[element.attr('name')];
        if (!value) {
          value = element.val();
        }
        else {
          value += ',' + element.val();
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
    this.resultType = 'dataset';
    if ($('#type-event').is(':checked')) {
      url = this.urls.apiPath + this.urls.searchEvent;
      this.resultType = 'event';
    }
    var self = this;
    $.get(url, this.getSearchParams(), function (response) {
      self.results = response.sort(site.sortBy('createTime', 'desc'));
      self.showResults();
    });
  },
  showResults: function (page) {
    var adaptedResults = {items: this.results};
    adaptedResults.type = {};
    adaptedResults.type.string = this.resultType;
    adaptedResults.type[this.resultType] = this.resultType; // Create a specific property for use in Handlebars if statements
    
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
  
  toTimeString: function(value){
      return moment(value).format('hh:mm:ss');
  },
  toDurationString: function(startTime, endTime) {
        var result = '';

        var duration = moment.duration(endTime - startTime);

        if (duration.years() !== 0) {
            result = duration.years() + 'Y ' + duration.months() + 'M ' + duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.months() !== 0) {
            result = duration.months() + 'M ' + duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.days() !== 0) {
            result = duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.hours() !== 0) {
            result = duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.minutes() !== 0) {
            result = duration.minutes() + 'm ';
        }

        result += duration.seconds() + '.' + duration.milliseconds() + 's';

        return result;

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
  Handlebars.registerHelper('toTimeString', site.toTimeString.bind(site));
  Handlebars.registerHelper('toDurationString', site.toDurationString.bind(site));

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
