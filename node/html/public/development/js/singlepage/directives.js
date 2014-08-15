'use strict';

/* Directives */


angular.module('myApp.directives', []).
        directive('appVersion', ['version', function(version) {
                return function(scope, elm, attrs) {
                    elm.text(version);
                };
            }])
        .directive('datasetList', function() {
            return {
                restrict: 'E',
                scope: {
                    list: '='
                },
                templateUrl: '/partials/datasetlist.html'
            };
        })
        .directive('datasetSearch', function() {
            return {
                restrict: 'E',
                scope: {},
                templateUrl: '/partials/datasetsearch.html'
            };
        });