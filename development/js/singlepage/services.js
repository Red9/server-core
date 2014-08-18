'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
        .value('version', '0.1')
        .factory('datastore', ['$http', 'apiUrl', function($http, apiUrl) {
                return {
                    get: function(resourceName, parameters, callback) {
                        $http({
                            method: 'GET',
                            params: parameters,
                            withCredentials: true,
                            url: apiUrl + '/' + resourceName + '/'
                        }).success(function(data, status) {
                            callback(data);
                        }).error(function(data, status) {
                            console.log('Error!');
                        });
                    }
                };
            }])
        .factory('api', function($resource, apiUrl) {
            return {
                dataset: $resource(apiUrl + '/dataset/:id', {id: '@id'}),
                event: $resource(apiUrl + '/event/:id', {id: '@id'}),
                comment: $resource(apiUrl + '/comment/:id', {id: '@id'}),
                user: $resource(apiUrl + '/user/:id', {id: '@id'}),
                video: $resource(apiUrl + '/video/:id', {id: '@id'})
            };
        });