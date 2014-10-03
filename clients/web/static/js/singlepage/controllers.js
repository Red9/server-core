(function () {
    'use strict';

    angular.module('redApp.controllers', [])
        .controller('pageController', function ($scope, $location, $cookieStore) {
            $scope.logout = function () {
                $scope.currentUser = null;
                $cookieStore.remove('connect.sid');
                $location.path('/page/about');
            };
        })
        .controller('search', function ($scope, $location) {
            $scope.searchFilters = $location.search();

            $scope.$watch('searchFilters', function (newValue, oldValue) {
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
        function ($scope) {
        })
        .controller('userProfile',
        function ($scope, $routeParams, api) {
            api.user.get({id: $routeParams.id}, function (user) {
                $scope.user = user;
            });
        })
        .controller('homeController',
        function ($scope) {
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
        })
        .controller('siteStatistics',
        function ($scope, _, api) {
            var parameters = {
                dataset: {
                    //part: 'title,id,createTime,headPanel.startTime,headPanel.endTime,owner.id,owner.displayName,count',
                    //count: true,
                    expand: 'headPanel,owner'
                },
                event: {
                    part: 'type,id,startTime,endTime,datasetId,summaryStatistics.static.cse.axes'
                }

            };

            api.dataset.query(parameters.dataset, function (datasets) {
                var datasetAggregate = _.reduce(datasets, function (memo, dataset) {
                    memo.sumDuration += dataset.headPanel.endTime - dataset.headPanel.startTime;
                    try {
                        memo.sumDistance += dataset.headPanel.summaryStatistics.static.route.path.distance.value;
                    } catch (e) {
                    }
                    return memo;
                }, {
                    sumDuration: 0,
                    sumDistance: 0
                });

                datasetAggregate.count = datasets.length;
                datasetAggregate.averageDuration = datasetAggregate.sumDuration / datasets.length;
                datasetAggregate.averageDistance = datasetAggregate.sumDistance / datasets.length;

                $scope.datasetAggregate = datasetAggregate;


                $scope.datasetUsers = _.chain(datasets)
                    .groupBy(function (dataset) {
                        return dataset.owner.id;
                    })
                    .map(function (list) {
                        return _.reduce(list, function (memo, dataset) {

                            memo.sumDuration += dataset.headPanel.endTime - dataset.headPanel.startTime;
                            memo.count += 1;

                            // A bit wasteful to set it on every iteration, but oh well.
                            memo.owner.id = dataset.owner.id;
                            memo.owner.displayName = dataset.owner.displayName;
                            return memo;
                        }, {
                            sumDuration: 0,
                            count: 0,
                            owner: {}
                        });
                    })
                    .value();
            });

            api.event.query({}, function (events) {


                var eventsAggregate = _.chain(events)
                    .groupBy('type')
                    .map(function (eventsByType, type) {
                        var t = {
                            manual: {
                                sumDuration: 0,
                                sumDistance: 0,
                                count: 0
                            },
                            auto: {
                                sumDuration: 0,
                                sumDistance: 0,
                                count: 0
                            }
                        };

                        var result = _.reduce(eventsByType, function (memo, event) {
                            if (event.source.type === 'manual' || event.source.type === 'auto') {
                                memo[event.source.type].sumDuration += event.endTime - event.startTime;
                                memo[event.source.type].count += 1;

                                try {
                                    memo[event.source.type].sumDistance += event.summaryStatistics.static.route.path.distance.value;
                                } catch (e) {
                                }

                            } else {
                                console.log('bad type: ' + event.id + ': ' + event.source.type);
                            }

                            return memo;
                        }, t);

                        result.manual.averageDuration = result.manual.sumDuration / result.manual.count;
                        result.auto.averageDuration = result.auto.sumDuration / result.auto.count;
                        result.type = type;
                        return result;
                    })
                    .value();
                $scope.eventsAggregate = eventsAggregate;

                $scope.eventCount = _.reduce(eventsAggregate, function (memo, agg) {
                    memo.manual.count += agg.manual.count;
                    memo.manual.sumDuration += agg.manual.sumDuration;
                    memo.auto.count += agg.auto.count;
                    memo.auto.sumDuration += agg.auto.sumDuration;
                    return memo;
                }, {
                    manual: {
                        count: 0,
                        sumDuration: 0
                    },
                    auto: {
                        count: 0,
                        sumDuration: 0
                    },
                    total: events.length
                });

            });
        });

})();
               