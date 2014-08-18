'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
        .controller('pageController', function($scope, $location, $cookieStore) {
            $scope.logout = function() {
                $scope.currentUser = null;
                $cookieStore.remove('connect.sid');
                $location.path('/page/about');
            };
        })
        .controller('searchDataset', function($scope, datastore) {
            $scope.searchFilters = {};
            $scope.datasetList = null;

            $scope.$watch('searchFilters', function(newValue, oldValue) {
                var parameters = {
                    part: 'title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count',
                    count: true,
                    expand: 'headPanel,owner'
                };
                $scope.datasetList = null;  // Clear variable to indicate loading
                datastore.get('dataset', angular.extend(parameters, newValue), function(data) {
                    $scope.datasetList = data;
                });

            });
        })
        .controller('searchEvent', function($scope, datastore) {
            $scope.searchFilters = {};

            $scope.eventList = null;

            $scope.$watch('searchFilters', function(newValue, oldValue) {
                var parameters = {
                    part: 'type,id,startTime,endTime'
                };

                $scope.eventList = null; // Clear variable to indicate loading
                datastore.get('event', angular.extend(parameters, newValue), function(data) {
                    $scope.eventList = data;
                });

            });
        })
        .controller('myProfile',
                function($scope) {
                })
        .controller('userProfile',
                function($scope, $routeParams, datastore) {
                    datastore.get('user', {id: $routeParams['id']}, function(data) {
                        $scope.user = data[0];
                    });
                })
        .controller('homeController',
                function($scope) {
                });
               