'use strict';

angular.module('redApp.services', [])

        /** Create a Red9 API accessor object
         *  
         *  Each resource has the following methods:
         *   - save (create)
         *   - get
         *   - query
         *   - update
         *   - delete
         *  
         */
        .factory('api', function($resource, $http, apiUrl) {
            $http.defaults.withCredentials = true;

            var apiOptions = {
                update: {method: 'PUT'}
            };

            return {
                dataset: $resource(apiUrl + '/dataset/:id', {id: '@id'}, apiOptions),
                event: $resource(apiUrl + '/event/:id', {id: '@id'}, apiOptions),
                comment: $resource(apiUrl + '/comment/:id', {id: '@id'}, apiOptions),
                user: $resource(apiUrl + '/user/:id', {id: '@id'}, apiOptions),
                video: $resource(apiUrl + '/video/:id', {id: '@id'}, apiOptions)
            };
        })
        .factory('confirmDialog', function($modal) {


            return function(parameters) {
                return function() {
                    var ModalInstanceCtrl = function($scope, $modalInstance) {
                        $scope.confirm = function() {
                            $modalInstance.close(true);
                        };

                        $scope.cancel = function() {
                            $modalInstance.dismiss('cancel');
                        };
                        $scope.message = parameters.message;
                    };

                    var modalInstance = $modal.open({
                        templateUrl: '/static/partials/modals/areyousure.html',
                        controller: ModalInstanceCtrl,
                        size: 'sm'
                    });

                    modalInstance.result.then(parameters.confirm, parameters.cancel);

                };
                /*
                 modalInstance.result.then(function(confirmed) {
                 console.log('confirmed: ' + confirmed);
                 }, function() {
                 console.log('Modal dismissed at: ' + new Date());
                 });
                 */
            };
        });