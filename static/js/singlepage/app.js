(function () {
    'use strict';

    angular.module('underscore', [])
        .factory('_', function () {
            return window._; // assumes underscore has already been loaded on the page
        });


// Declare app level module which depends on filters, and services
    angular.module('redApp', [
        'ui.bootstrap',
        'ngAnimate',
        'ngRoute',
        'ngCookies',
        'ngResource',
        'angularSpinner',
        'angular.filter',
        'underscore',
        'redApp.filters',
        'redApp.services',
        'redApp.directives',
        'redApp.controllers'

    ])
        .config(function ($routeProvider, $locationProvider) {


            // Resources
            $routeProvider.when('/', {
                templateUrl: '/static/partials/home.html',
                controller: 'homeController',
                accessLevel: 'user',
                title: 'Red9: Measure Up to You'
            });
            $routeProvider.when('/dataset/', {
                templateUrl: '/static/partials/searchdataset.html',
                controller: 'search',
                accessLevel: 'user',
                title: 'R9: Dataset Search'
            });
            $routeProvider.when('/event/', {
                templateUrl: '/static/partials/searchevent.html',
                controller: 'search',
                accessLevel: 'user',
                title: 'R9: Event Search'
            });

            $routeProvider.when('/user/me', {
                templateUrl: '/static/partials/myprofile.html',
                controller: 'myProfile',
                accessLevel: 'user',
                title: 'R9: My Profile'
            });
            $routeProvider.when('/user/:id', {
                templateUrl: '/static/partials/userprofile.html',
                controller: 'userProfile',
                accessLevel: 'user',
                title: 'R9: User Profile'
            });
            $routeProvider.when('/aggregate/sitestatistics', {
                templateUrl: '/static/partials/aggregate/sitestatistics.html',
                controller: 'siteStatistics',
                accessLevel: 'user',
                title: 'R9: Site Statistics'
            });

            // Pages
            $routeProvider.when('/page/404', {
                templateUrl: '/static/partials/page/404.html',
                accessLevel: 'public',
                title: 'R9: 404'
            });
            $routeProvider.when('/page/about', {
                templateUrl: '/static/partials/page/about.html',
                accessLevel: 'public',
                title: 'R9: About'
            });
            $routeProvider.when('/page/jobs', {
                templateUrl: '/static/partials/page/jobs.html',
                accessLevel: 'public',
                title: 'R9: Jobs'
            });
            $routeProvider.when('/page/monitor', {
                templateUrl: '/static/partials/page/monitor.html',
                accessLevel: 'admin',
                title: 'R9: Admin'
            });
            $routeProvider.when('/page/team', {
                templateUrl: '/static/partials/page/team.html',
                accessLevel: 'public',
                title: 'R9: Team'
            });
            $routeProvider.when('/page/uploadrnc', {
                templateUrl: '/static/partials/page/uploadrnc.html',
                accessLevel: 'public',
                title: 'R9: Upload RNC'
            });

            $routeProvider.otherwise({
                redirectTo: '/page/404'
            });

            $locationProvider.html5Mode(true);
        })

        .run(function ($rootScope, $location, $cookieStore) {
            // The idea of using cookies for initial user authentication came from this page:
            // http://www.frederiknakstad.com/2013/01/21/authentication-in-single-page-applications-with-angular-js/
            var currentUser = $cookieStore.get('currentUser');
            // currentUser may be undefined, in which case we set it to null.
            $rootScope.currentUser = typeof currentUser === 'undefined' ? null : currentUser;
            $cookieStore.remove('currentUser');

            // Check authentication
            $rootScope.$on('$routeChangeStart', function (event, nextLoc, currentLoc) {
                if ($rootScope.currentUser === null && nextLoc.accessLevel !== 'public') {
                    $location.path('/page/404');
                } else {

                }
            });

            // Set page title
            $rootScope.$on('$routeChangeSuccess', function (event, currentRoute, previousRoute) {
                $rootScope.pageTitle = currentRoute.title;
            });

            // Allow us to do special things in the development site version
            if ($location.host() === 'localdev.redninesensor.com') {
                $rootScope.developmentSite = true;
            }
        });
})();

