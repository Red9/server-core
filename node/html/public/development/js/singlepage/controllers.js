'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
        .controller('pageController', ['$scope', function($scope) {
                $scope.user = {
                    id: '1234',
                    displayName: 'srlm'

                };
                $scope.site = {
                    title: 'test site',
                    description: 'a cool new version',
                    author: {
                        displayName: 'srlm',
                        email: 'srlm@srlmproductions.com'
                    }
                };

            }])
        .controller('searchDataset', ['$scope', '$http', function($scope, $http) {
                $http({
                    method: 'GET',
                    //url: 'http://api.localdev.redninesensor.com/dataset/?part=title,id,createTime'
                    url: 'http://api.localdev.redninesensor.com/dataset/?part=title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count&count=true&expand=headPanel,owner'
                }).success(function(data, status) {
                    $scope.list = data;
                }).error(function(data, status) {
                    console.log('Error!');
                });
            }])
        .controller('searchEvent', ['$scope', function($scope) {

            }]);