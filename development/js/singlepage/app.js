'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
    'ui.bootstrap',
    'ngRoute',
    'myApp.filters',
    'myApp.services',
    'myApp.directives',
    'myApp.controllers'
]).
        config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
                $routeProvider.when('/', {
                    templateUrl: '/partials/home.html',
                    controller: 'homeController'
                });
                $routeProvider.when('/dataset/', {
                    templateUrl: '/partials/searchdataset.html',
                    controller: 'searchDataset',
                    reloadOnSearch: false
                });
                $routeProvider.when('/event/', {
                    templateUrl: '/partials/searchevent.html',
                    controller: 'searchEvent'
                });
                $routeProvider.when('/about', {
                    templateUrl: '/partials/about.html'
                });
                $routeProvider.when('/login', {
                    templateUrl: '/partials/login.html'
                });
                $routeProvider.when('/user/me', {
                    templateUrl: '/partials/myprofile.html',
                    controller: 'myProfile'
                });
                $routeProvider.when('/user/:id', {
                    templateUrl: '/partials/userprofile.html',
                    controller: 'userProfile'
                });
                $routeProvider.when('/404', {
                    templateUrl: '/partials/404.html'
                });
                $routeProvider.when('/monitor', {
                    templateUrl: '/partials/monitor.html'
                });

                // /logout
                $routeProvider.otherwise({
                    redirectTo: '/404'
                });



                $locationProvider.html5Mode(true);
            }]);


