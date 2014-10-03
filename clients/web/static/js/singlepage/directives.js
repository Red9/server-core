(function() {
    'use strict';

    /* Directives */
    angular.module('redApp.directives', [])
            .directive('resourceList', function() {
                return {
                    restrict: 'E',
                    templateUrl: function(element, attributes) {
                        return '/static/partials/' + attributes.resourceType + 'list.html';
                    },
                    scope: {
                        resourceFilters: '=',
                        resourceType: '@'
                    },
                    controller: function($scope, $location, $q, _, api, confirmDialog) {
                        $scope.resourceList = null;
                        $scope.resultDisplay = 'table';

                        var parameters = {
                            dataset: {
                                part: 'title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count',
                                count: true,
                                expand: 'headPanel,owner'
                            },
                            event: {
                                part: 'type,id,startTime,endTime,datasetId,summaryStatistics.static.cse.axes'
                            }

                        };

                        var sortBy = {
                            dataset: function(dataset) {
                                return -dataset.createTime;
                            },
                            event: function(event) {
                                return -event.startTime;
                            }
                        };


                        // Creates a page of resources suitable for display. This
                        // page is just a shallow copy, so no need to use it for
                        // anything but display.
                        function extractResourcePage() {

                            if ($scope.resourceList) {
                                var page = $scope.resourcePages.currentPage;
                                var ipp = $scope.resourcePages.itemsPerPage;

                                $scope.resourcePage = $scope.resourceList.slice(
                                        (page - 1) * ipp,
                                        page * ipp
                                        );
                            } else {
                                $scope.resourcePage = null;
                            }
                        }

                        $scope.$watch('resourcePages.currentPage', extractResourcePage);
                        $scope.$watch('resourcePages.itemsPerPage', extractResourcePage);
                        $scope.$watchCollection('resourceList', extractResourcePage);

                        $scope.$watch('resourceFilters', function(newValue, oldValue) {
                            $scope.resourceList = null;  // Clear variable to indicate loading

                            api[$scope.resourceType].query(
                                    angular.extend(parameters[$scope.resourceType], newValue),
                                    function(data) {

                                        // The currentPage set should be before the
                                        // resourceList set. This will allow the change
                                        // in the resourceList to initiate a change
                                        // in the page
                                        $scope.resourcePages.currentPage = 1;
                                        $scope.resourceList = _.sortBy(data, sortBy[$scope.resourceType]);
                                    });
                        });

                        // Gets all the resources that have the selected option set.
                        function extractSelected(list) {
                            return _.filter(list, function(resource) {
                                return resource.selected;
                            });
                        }

                        $scope.deleteSelected = function(list) {
                            var deleteList = extractSelected(list);

                            if (deleteList.length === 0) {
                                return; // Do nothing if nothing is selected.
                            }

                            confirmDialog({
                                message: "You're about to delete " + deleteList.length + " " + $scope.resourceType + "s. This is non-reversible.",
                                confirm: function(confirmation) {
                                    if (confirmation === false) {
                                        return; // do nothing
                                    }

                                    _.each(deleteList, function(item) {
                                        api[$scope.resourceType].delete({id: item.id}, function() {
                                            list.splice(_.indexOf(list, item), 1);
                                        });
                                    });
                                },
                                cancel: function() {
                                }
                            })();
                        };

                        $scope.resourcePages = {
                            itemsPerPage: 25,
                            maxSize: 5, // The maximum number of page numbers to display.
                            currentPage: 1
                        };

                        if ($scope.resourceType === 'dataset') {
                            $scope.searchEvents = function(datasetList) {

                                var selectedList = extractSelected(datasetList);
                                if (selectedList.length === 0) {
                                    return; // Do nothing if nothing is selected
                                }

                                var url = '/event/?datasetId=' + _.pluck(selectedList, 'id').join(',');

                                $location.url(url);
                            };
                        } else if ($scope.resourceType === 'event') {
                            $scope.datasetGroups = null;
                            $scope.$watchCollection('resourceList', function(newValue) {
                                $scope.datasetGroups = _.chain(newValue)
                                        .groupBy('datasetId')
                                        .reduce(function(memo, eventList, datasetId, index) {
                                            console.log('index: ' + index);
                                            if (memo[memo.length - 1].length === 3) {
                                                memo.push([]);
                                            }

                                            var sumDuration = 0;

                                            var groupedEventList = _.chain(eventList)
                                                    .groupBy('type')
                                                    .map(function(events, type) {
                                                        var duration = _.reduce(events, function(memo, event) {
                                                            memo += (event.endTime - event.startTime);
                                                            return memo;
                                                        }, 0);

                                                        sumDuration += duration;

                                                        return {
                                                            type: type,
                                                            duration: duration,
                                                            count: events.length
                                                        };
                                                    })
                                                    .map(function(eventSummary, type) {
                                                        eventSummary.percent = (eventSummary.duration / sumDuration) * 100;
                                                        eventSummary.percentString = eventSummary.percent + '%';
                                                        return eventSummary;
                                                    })
                                                    .sortBy(function(eventSummary) {
                                                        return eventSummary.type;
                                                    })
                                                    .value();


                                            memo[memo.length - 1].push({
                                                datasetId: datasetId,
                                                eventList: groupedEventList
                                            });
                                            return memo;
                                        }, [[]])
                                        .value();
                            });
                        }
                    }
                };
            })
            .directive('datasetSearch', function(api) {
                return {
                    restrict: 'E',
                    scope: {
                        searchFilters: '='
                    },
                    templateUrl: '/static/partials/datasetsearch.html',
                    controller: function($scope, $location) {

                        $scope.search = {};

                        var queryParameters = $location.search();

                        // On page load pull in the initial search parameters to
                        // populate the form
                        $scope.search.title = queryParameters.title;

                        api.user.query({}, function(users) {
                            $scope.users = users;

                            // First time prepopulate
                            if (queryParameters['owner.id']) {
                                $scope.users.forEach(function(user) {
                                    if (user.id === queryParameters['owner.id']) {
                                        $scope.search.user = user;
                                    }
                                });
                            }
                        });

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

                            $scope.search = searchForm; // Need this line to keep the form values populated
                        };
                    }
                };
            });
})();