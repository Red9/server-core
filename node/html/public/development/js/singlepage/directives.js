'use strict';

/* Directives */


angular.module('myApp.directives', [])
        .directive('appVersion', ['version', function(version) {
                return function(scope, elm, attrs) {
                    elm.text(version);
                };
            }])
        .directive('datasetList', ['datastore', function(datastore) {
                return {
                    restrict: 'E',
                    templateUrl: '/partials/datasetlist.html',
                    scope: {
                        datasetList: '='
                    },
                    controller: function($scope) {
                        $scope.hello = "Welcome message";
                    },
                    link: function(scope, elem, attrs) {
                        console.log('datasetList');
                    }
                };
            }])
        .directive('datasetSearch', ['currentUser', 'datastore', function(currentUser, datastore) {
                console.log('currentUser: ' + JSON.stringify(currentUser.getCurrentUser()));
                return {
                    restrict: 'E',
                    scope: {
                        searchFilters: '='
                    },
                    templateUrl: '/partials/datasetsearch.html',
                    controller: function($scope) {
                        $scope.formChange = function(searchForm) {

                            // title, user, startTime, endTime

                            function isValidInput(input) {
                                return angular.isDefined(input)
                                        && input !== null
                                        && input !== ''
                                        && input !== {};
                            }

                            var search = {};

                            if (isValidInput(searchForm.title)) {
                                search.title = searchForm.title;
                            }
                            if (isValidInput(searchForm.user)) {
                                search['owner.id'] = searchForm.user.id;
                            }

                            $scope.searchFilters = search;
                        };
                    },
                    link: function(scope, elem, attrs) {

                        datastore.get('user', {}, function(users) {
                            scope.users = users;
                        });
                    }
                };
            }])
        .directive('eventList', ['datastore', function(datastore) {
                return {
                    restrict: 'E',
                    templateUrl: '/partials/eventlist.html',
                    scope: {
                        eventList: '='
                    },
                    controller: function($scope) {
                        $scope.hello = "Welcome message";
                    },
                    link: function(scope, elem, attrs) {
                        console.log('eventList');
                    }
                };
            }]);