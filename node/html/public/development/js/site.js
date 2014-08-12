define(['vendor/jquery', 'vendor/underscore', 'vendor/handlebars', 'vendor/moment', 'vendor/jquery-ui', 'customHandlebarsHelpers'], function($, _, Handlebars, moment) {
    // AJAX: always send session cookie with requests.
    $.ajaxSetup({
        xhrFields: {
            withCredentials: true
        }
    });
    var site = {
        //props
        adapter: {
            //adapts a google address into an app address
            address: function(components) {
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
                components.forEach(function(item) {
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
        searchPageSize: 2000,
        templates: {},
        urls: {
            apiPath: null, //Dynamically set
            searchDataset: '/dataset/',
            searchEvent: '/event/',
            eventTypes: function() {
                return site.urls.apiPath + '/eventtype/';
            }, // What a hack!!!
            userList: '/user/'
        },
        getChecked: function() {
            var checkedItems = [];
            $('#result_tbody tr td #selectCheckbox').each(function(index, element) {
                var checkbox = $(element);
                if (checkbox.prop('checked') === true) {
                    checkedItems.push(checkbox.attr('value'));
                }
            });
            return checkedItems;
        },
        deleteChecked: function(resultType) {
            console.log('Result type: ' + resultType);
            $('#result_tbody tr td #selectCheckbox').each(function(index, element) {
                var checkbox = $(element);
                if (checkbox.prop('checked') === true) {
                    //console.log('Checked: ' + checkbox.attr('value'));
                    site.deleteItem(resultType, checkbox.attr('value'));
                }

            });
        },
        //methods
        deleteItem: function(type, id) {
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
        getIndexInResults: function(id) {
            var i;
            for (i = 0; i < this.results.length; i++) {
                if (this.results[i].id === id) {
                    return i;
                }
            }
            return -1;
        },
        getSearchParams: function() {
            var context = $('#filter-form .filter-item:not(.inactive):not(.ignore)');
            var params = {};
            var self = this;
            $('input, select', context).not(':radio, :checkbox, .ignore').each(function() {
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
            $(':radio, :checkbox', context).not('.ignore').filter(':checked').each(function() {
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
            $('.slider', context).each(function() {
                var element = $(this);
                if (!element.data('initialized')) {
                    return;
                }
                var values = element.slider('values');
                if (values.length === 2 && values[1]) {
                    //unit conversion (ie: mile to meter)
                    var convert = function(value) {
                        return value;
                    };
                    if (element.data('tovalue')) {
                        convert = self[element.data('tovalue')];
                    }
                    params[element.data('name') + '.more'] = convert(values[0]);
                    params[element.data('name') + '.less'] = convert(values[1]);
                }
            });
            return params;
        },
        clearSearchFilter: function() {
            location.hash = '#';
            var context = $('#filter-form .filter-item:not(.inactive)');
            $(' input, select', context).not(':radio, :checkbox').val(null);
            $('#additional-filters-container').empty();
            $('#location-remove').click();
            $('.slider', context).each(function() {
                var element = $(this);
                if (!element.data('initialized')) {
                    return;
                }
                element.slider('values', [0, 0]);
            });
            this.search();
        },
        search: function() {
            var url = '';
            var searchParams = this.getSearchParams();
            if ($('#type-event').is(':checked')) {
                url = this.urls.apiPath + this.urls.searchEvent;
                this.resultType = 'event';
                searchParams['part'] = 'id,type,startTime,endTime';
            } else { // Dataset
                url = this.urls.apiPath + this.urls.searchDataset;
                this.resultType = 'dataset';
                searchParams['expand'] = 'headPanel,owner';
                searchParams['count'] = 'true';
                searchParams['part'] = 'id,count,title,createTime,owner.id,owner.displayName,headPanel.startTime,headPanel.endTime';
            }
            $('#container-results').empty();
            var self = this;
            $.get(url, searchParams, function(response) {
                self.results = _.sortBy(response, function(resource) {
                    if (_.has(resource, 'createTime') === true) {
                        return 0 - resource.createTime;
                    } else if (_.has(resource, 'startTime') === true) {
                        return 0 - resource.startTime;
                    } else {
                        return 0;
                    }
                });

                // Remove the 0 counts so that the badges don't display.
                _.each(self.results, function(result) {
                    _.each(result.count, function(count, key) {
                        if (count <= 0) {
                            delete result.count[key];
                        }
                    });
                });
                self.showResults();
            });
        },
        showResults: function(page) {
            var adaptedResults = {items: this.results};
            adaptedResults.type = {};
            adaptedResults.type.string = this.resultType;
            adaptedResults.type[this.resultType] = this.resultType; // Create a specific property for use in Handlebars if statements

            if (adaptedResults.items.length > this.searchPageSize) {
                var paging = {
                    length: Math.ceil(adaptedResults.items.length / this.searchPageSize),
                    current: page || 0,
                    totalResults: adaptedResults.items.length
                };
                adaptedResults.paging = paging;
                adaptedResults.items = adaptedResults.items.slice(
                        paging.current * this.searchPageSize,
                        (paging.current + 1) * this.searchPageSize);
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
            var circle = new google.maps.Circle({
                map: map,
                radius: 100,
                fillColor: '#224B8A',
                fillOpacity: 0.6,
                strokeColor: 'transparent'
            });
            this.mapContext = {map: map, marker: marker, circle: circle};

            google.maps.event.addListener(map, 'click', function(event) {
                if (!marker.getMap()) {
                    marker.setPosition(event.latLng);
                    marker.setMap(map);
                    markerPositionChanged();
                    circle.bindTo('center', marker, 'position');
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
        setAutocompleteMultiple: function(element, list) {
            function split(val) {
                return val.split(/,\s*/);
            }
            function extractLast(term) {
                return split(term).pop();
            }
            $(element)
                    .bind('keydown', function(event) {
                        // don't navigate away from the field on tab when selecting an item
                        if (event.keyCode === $.ui.keyCode.TAB && $(this).data('ui-autocomplete').menu.active) {
                            event.preventDefault();
                        }
                    })
                    .autocomplete({
                        minLength: 0,
                        source: function(request, response) {
                            // delegate back to autocomplete, but extract the last term
                            response($.ui.autocomplete.filter(
                                    list, extractLast(request.term))
                                    );
                        },
                        focus: function() {
                            // prevent value inserted on focus
                            return false;
                        },
                        select: function(event, ui) {
                            var terms = split(this.value);
                            terms.pop();
                            terms.push(ui.item.value);
                            terms.push('');
                            this.value = terms.join(', ');
                            return false;
                        }
                    });
        },
        /**
         * Removes the marker from the map
         */
        clearMap: function() {
            if (!this.mapContext) {
                return;
            }
            this.mapContext.marker.setMap(null);
        },
        setSlider: function(context, options) {
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
            }).data('initialized', true);
        },
        mileToMeter: function(value) {
            return parseFloat(value) / 0.00062137;
        },
        minToMs: function(value) {
            return parseFloat(value) * 60000;
        },
        sortBy: function(name, order) {
            if (order !== 'desc') {
                return function(a, b) {
                    if (a[name] > b[name]) {
                        return 1;
                    }
                    else if (a[name] < b[name]) {
                        return -1;
                    }
                    return 0;
                };
            }
            else
            {
                return function(a, b) {
                    if (b[name] > a[name]) {
                        return 1;
                    }
                    else if (b[name] < a[name]) {
                        return -1;
                    }
                    return 0;
                };
            }
        }
    };
    if (Handlebars) {
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
                builder.push('<li><a href="#" onclick="' + getOnClick(context.current - 1) + '">&laquo;</a></li>');
            }
            else {
                builder.push('<li class="disabled"><span>&laquo;</span></li>');
            }
            for (var i = 0; i < context.length; i++) {
                builder.push('<li');
                if (i === context.current) {
                    builder.push(' class="active"');
                }
                builder.push('><a href="#" onclick="');
                builder.push(getOnClick(i));
                builder.push('">');
                builder.push(i + 1);
                builder.push('</a></li>');
            }
            if (context.current < context.length - 1) {
                builder.push('<li><a href="#' + getOnClick(context.current + 1) + '">&raquo;</a></li>');
            }
            else {
                builder.push('<li class="disabled"><span>&raquo;</span></li>');
            }
            builder.push('</ul');
            return builder.join('');
        });
    }
    window.site = site; // Set global;
    return site;
});
