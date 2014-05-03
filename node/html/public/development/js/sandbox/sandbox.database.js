define(['vendor/jquery', 'vendor/underscore'
], function($, _) {

    function sandboxDatabase(sandbox) {
        sandbox.get = function(resourceType, constraints, callback, expand) {
            if (typeof expand !== 'undefined') {
                constraints.expand = "";
                _.each(expand, function(value, index) {
                    if (index > 0) {
                        constraints.expand += ',';
                    }
                    constraints.expand += value;
                });
            }

            $.ajax({
                type: 'GET',
                url: sandbox.apiUrl + '/' + resourceType + '/?' + $.param(constraints),
                dataType: 'json',
                success: callback
            });
        };
        sandbox.getSchema = function(resourceType, callback) {
            $.ajax({
                type: 'GET',
                url: sandbox.apiUrl + '/' + resourceType + '/describe',
                dataType: 'json',
                success: callback
            });
        };
        sandbox.update = function(resourceType, id, newValues, callback) {
            console.log('resourceType: ' + resourceType);
            console.log('id: ' + id);
            $.ajax({
                type: 'PUT',
                url: sandbox.apiUrl + '/' + resourceType + '/' + id,
                dataType: 'json',
                data: newValues,
                success: function() {
                    callback();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    callback(textStatus + '---' + errorThrown + ' --- ' + jqXHR.responseText);
                }
            });
        };
        sandbox.create = function(resourceType, newResource, callback) {
            $.ajax({
                type: 'POST',
                url: sandbox.apiUrl + '/' + resourceType + '/',
                dataType: 'json',
                data: newResource,
                success: function(data) {
                    callback(undefined, data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    callback(textStatus + '---' + errorThrown + ' --- ' + jqXHR.responseText);
                }
            });
        };
        sandbox.delete = function(resourceType, id) {
            $.ajax({
                type: 'DELETE',
                url: sandbox.apiUrl + '/' + resourceType + '/' + id,
                dataType: 'json',
                success: function() {
                    sandbox.initiateResourceDeletedEvent(resourceType, id);
                }
            });
        };
        sandbox.getPanel = function(id, startTime, endTime, cache, callback) {
            var panelParameters = {
                buckets: 1000,
                format: 'json',
                cache: 'off'
            };
            if (typeof startTime !== 'undefined') {
                panelParameters.startTime = startTime;
            }
            if (typeof endTime !== 'undefined') {
                panelParameters.endTime = endTime;
            }
            if (cache === true) {
                panelParameters.cache = 'on';
            }

            $.ajax({
                type: 'GET',
                url: sandbox.apiUrl + '/panel/' + id + '/body/?' + $.param(panelParameters),
                dataType: 'json',
                success: function(panel) {
                    _.each(panel.values, function(row) {
                        row[0] = new Date(row[0]);
                    });
                    callback(panel);
                }
            });
        };
    }
    return sandboxDatabase;


});