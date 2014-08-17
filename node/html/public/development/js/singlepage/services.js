'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
        .value('version', '0.1')
        .factory('currentUser', ['$http', '$rootScope', function($http, $rootScope) {
                var apiUrl = 'http://api.localdev.redninesensor.com/';
                var currentUser = null;

                $http({
                    method: 'GET',
                    withCredentials: true,
                    url: apiUrl + 'user/current'
                }).success(function(data, status) {
                    currentUser = data;
                    $rootScope.$broadcast('currentUser', currentUser);
                }).error(function(data, status) {
                    currentUser = null;
                    $rootScope.$broadcast('currentUser', {user: null});
                });

                return {
                    getCurrentUser: function() {
                        return currentUser;
                    }
                };
            }])
        .factory('datastore', ['$http', function($http) {
                var apiUrl = 'http://api.localdev.redninesensor.com/';

                return {
                    get: function(resourceName, parameters, callback) {
                        $http({
                            method: 'GET',
                            params: parameters,
                            withCredentials: true,
                            url: apiUrl + resourceName + '/'
                        }).success(function(data, status) {
                            callback(data);
                        }).error(function(data, status) {
                            console.log('Error!');
                        });
                    }
                }
            }]);

 