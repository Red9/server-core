'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/dataset/', {templateUrl: '/partials/searchdataset.html', controller: 'searchDataset'});
  $routeProvider.when('/event/', {templateUrl: '/partials/searchevent.html', controller: 'searchEvent'});
  $routeProvider.otherwise({redirectTo: '/dataset/'});
}]);