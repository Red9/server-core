(function() {
    'use strict';

    angular.module('redApp.controllers', [])
            .controller('pageController', function($scope, $location, $cookieStore) {
                $scope.logout = function() {
                    $scope.currentUser = null;
                    $cookieStore.remove('connect.sid');
                    $location.path('/page/about');
                };
            })
            .controller('search', function($scope, $location) {
                $scope.searchFilters = $location.search();

                $scope.$watch('searchFilters', function(newValue, oldValue) {
                    if (Object.keys(newValue).length > 0) {
                        // Set the search keys
                        $location.search(newValue);
                    } else {
                        // Clear the search keys
                        $location.url($location.path());
                    }
                    //$scope.datasetList = null;
                    $scope.resourceFilters = $scope.searchFilters;
                });
            })
            .controller('myProfile',
                    function($scope) {
                    })
            .controller('userProfile',
                    function($scope, $routeParams, api) {
                        api.user.get({id: $routeParams.id}, function(user) {
                            $scope.user = user;
                        });
                    })
            .controller('homeController',
                    function($scope) {
                        $scope.message = 'hello';
                        $scope.datasetFilters = {
                            user: {
                                'owner.id': $scope.currentUser.id,
                                'createTime.more': Date.now() - 1000 * 60 * 60 * 24 * 30 * 3
                            },
                            allRecent: {
                                'createTime.more': Date.now() - 1000 * 60 * 60 * 24 * 30 * 1
                            }
                        };
                    });

})();
               