'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
        .controller('pageController', ['$scope', 'currentUser', function($scope, currentUser) {
                console.log('new page!');
                $scope.currentUser = currentUser.getCurrentUser();
                $scope.site = {
                    title: 'test site',
                    description: 'a cool new version',
                    author: {
                        displayName: 'srlm',
                        email: 'srlm@srlmproductions.com'
                    }
                };

                $scope.$on('currentUser', function(event, newUser) {
                    $scope.currentUser = currentUser.getCurrentUser();
                });

            }])
        .controller('searchDataset', ['$scope', 'datastore', function($scope, datastore) {
                $scope.searchFilters = {
                    'owner.id': 'fadedcab-0528-e834-b47d-c80e3696846c'
                };

                $scope.datasetList = [];

                $scope.$on('$routeUpdate', function() {
                    console.log('route has been updated.');
                });

                $scope.$watch('searchFilters', function(newValue, oldValue) {
                    console.log('search has changed: ' + JSON.stringify(newValue));
                    var parameters = {
                        part: 'title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count',
                        count: true,
                        expand: 'headPanel,owner'
                    };

                    datastore.get('dataset', angular.extend(parameters, newValue), function(data) {
                        console.log('got results');
                        $scope.datasetList = data;
                    });

                });
            }])
        .controller('searchEvent', ['$scope', 'datastore', function($scope, datastore) {
                $scope.searchFilters = {};

                $scope.eventList = [];

                $scope.$on('$routeUpdate', function() {
                    console.log('route has been updated.');
                });

                $scope.$watch('searchFilters', function(newValue, oldValue) {
                    console.log('search has changed: ' + JSON.stringify(newValue));
                    var parameters = {
                        part: 'type,id,startTime,endTime'
                    };

                    datastore.get('event', angular.extend(parameters, newValue), function(data) {
                        console.log('got results');
                        $scope.eventList = data;
                    });

                });
            }])
        .controller('myProfile', ['$scope', 'currentUser', 'datastore',
            function($scope, currentUser, datastore) {
                $scope.user = currentUser.getCurrentUser();
            }])
        .controller('userProfile', ['$scope',
            function($scope) {

            }])
        .controller('homeController', ['$scope',
            function($scope) {

            }]);
               