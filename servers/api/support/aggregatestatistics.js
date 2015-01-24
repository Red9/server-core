'use strict';

var _ = require('lodash');

function calculateSingleCompound(statistics, sumDuration, resource,
                                 measurementKey, measurementValue) {
    if (!_.has(statistics, measurementKey)) {
        statistics[measurementKey] = {};
    }

    var stats = statistics[measurementKey]; // Convenience handle

    _.each(measurementValue, function (axisValue, axisKey) {

        var axisStats;

        if (_.isObject(axisValue)) { // compound value
            if (!_.has(stats, axisKey)) {
                stats[axisKey] = {
                    count: 0,
                    average: 0,
                    duration: 0
                };
            }

            axisStats = stats[axisKey]; // Convenience handle

            if (axisValue.minimum !== Number.MAX_VALUE &&
                (!_.has(axisStats, 'minimum') ||
                axisStats.minimum.value > axisValue.minimum)) {
                axisStats.minimum = {
                    value: axisValue.minimum,
                    id: resource.id
                };
            }

            if (axisValue.maximum !== -Number.MAX_VALUE &&
                (!_.has(axisStats, 'maximum') ||
                axisStats.maximum.value > axisValue.maximum)) {
                axisStats.maximum = {
                    value: axisValue.maximum,
                    id: resource.id
                };
            }

            if (!_.isNull(axisStats.average)) {
                var duration = resource.endTime - resource.startTime;
                axisStats.average =
                    (axisStats.average * sumDuration +
                    axisValue.average * duration) / (sumDuration + duration);
                axisStats.count += axisValue.count;
            }
        } else { // discrete value
            if (!_.isNull(axisValue)) {
                if (!_.has(stats, axisKey)) {
                    stats[axisKey] = {
                        count: 0,
                        average: 0,
                        sum: 0
                    };
                }

                axisStats = stats[axisKey]; // Convenience handle

                if (!_.has(axisStats, 'minimum') ||
                    axisStats.minimum.value > axisValue) {
                    axisStats.minimum = {
                        value: axisValue,
                        id: resource.id
                    };
                }
                if (!_.has(axisStats, 'maximum') ||
                    axisStats.maximum.value < axisValue) {
                    axisStats.maximum = {
                        value: axisValue,
                        id: resource.id
                    };
                }

                // compute weighted average
                axisStats.average =
                    axisStats.average * axisStats.count + axisValue;
                axisStats.count++;
                axisStats.average /= axisStats.count;
                axisStats.sum += axisValue;
            }
        }
    });
}

function testAndAddMinMax(object, id, value) {
    if (!_.has(object, 'minimum') || object.minimum.value > value) {
        object.minimum = {
            value: value,
            id: id
        };
    }
    if (!_.has(object, 'maximum') || object.maximum.value < value) {
        object.maximum = {
            value: value,
            id: id
        };
    }
}

function calculateCompoundStatistics(resourceList) {
    var compoundStatistics = {};

    var sumDuration = 0;
    _.each(resourceList, function (resource) {
        _.each(resource.summaryStatistics,
            function (statisticValue, statisticKey) {
                calculateSingleCompound(compoundStatistics,
                    sumDuration,
                    resource,
                    statisticKey,
                    statisticValue);
            });
        sumDuration += resource.endTime - resource.startTime;
    });
    return compoundStatistics;
}

function calculateTemporalStatistics(resourceList) {

    var durationStatistic = {
        sum: 0
    };

    var intervalStatistic = {
        sum: 0
    };

    _.each(resourceList, function (resource, index) {
        var duration = resource.endTime - resource.startTime;
        durationStatistic.sum += duration;
        testAndAddMinMax(durationStatistic, resource.id, duration);

        if (index !== 0) {
            var interval = resource.startTime - resourceList[index - 1].endTime;
            intervalStatistic.sum += interval;
            testAndAddMinMax(intervalStatistic,
                [resource.id, resourceList[index - 1].id], interval);
        }
    });

    durationStatistic.average = durationStatistic.sum / resourceList.length;
    intervalStatistic.average = intervalStatistic.sum /
    (resourceList.length - 1);

    var coveredTime = resourceList[resourceList.length - 1].endTime -
        resourceList[0].startTime;

    if (resourceList.length < 2) {
        // Can't have an interval with less than 2 times
        intervalStatistic = undefined;
    }

    return {
        interval: intervalStatistic,
        duration: durationStatistic,
        coveredTime: coveredTime,
        dutyCycle: durationStatistic.sum / coveredTime,
        // Milliseconds to seconds, for Hz.
        frequency: resourceList.length / coveredTime / 1000
    };
}

function calculateForList(resourceList) {
    if (!resourceList || resourceList.length === 0) {
        return {};
    }

    var resourcesSorted = _.sortBy(resourceList, 'startTime');
    return {
        compound: calculateCompoundStatistics(resourcesSorted),
        temporal: calculateTemporalStatistics(resourcesSorted),
        count: resourcesSorted.length,
        idList: _.pluck(resourcesSorted, 'id')
    };
}

function calculateGroupedBy(resourceList, groupByKey) {
    return _.chain(resourceList).groupBy(groupByKey).reduce(
        function (memo, resources, eventType) {
            memo[eventType] = calculateForList(resources);
            return memo;
        }, {}).value();
}

/** Calculate aggregate statistics.
 *
 * @param {Array} resourceList - Objects with summaryStatistics.
 * @param {String} [groupByKey] - Calculate aggregate statistics for each set
 *                                  in the group.
 * @returns {Object}
 */
module.exports = function (resourceList, groupByKey) {
    if (groupByKey) {
        return {
            groupedBy: calculateGroupedBy(resourceList, groupByKey),
            all: calculateForList(resourceList)
        };
    } else {
        return calculateForList(resourceList);
    }
};
