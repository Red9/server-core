'use strict';

var _ = require('lodash');
var moment = require('moment');

/** Run a nested group by on the datasets.
 *
 * Example1: ['userId', 'month'] allows you to take a set of datasets and
 * group by userId, then for each user group datasets by month.
 *
 * Example2: ['sport', 'week', 'userId'] allows you to group the datasets
 * by sport type, then by week of year, then by the individual users in that
 * week.
 *
 * Inspired by: http://stackoverflow.com/a/22716989/2557842
 *
 * Supports special keys:
 *
 * - 'year'
 * - 'quarter'
 * - 'month'
 * - 'week'
 * - 'day'
 *
 * @param {Array} datasetList A list of datasets.
 * @param {Array} keys Any dataset key, or any of the above special keys.
 *                      results are nested based on the keys provided.
 */
module.exports = function (datasetList, keys) {
    if (!keys.length) {
        return datasetList;
    }

    var key = keys[0];

    // TODO: Does this properly account for timezones?

    if (key === 'year' ||
        key === 'quarter' ||
        key === 'month' ||
        key === 'week' ||
        key === 'day') {
        datasetList = _.map(datasetList, function (dataset) {
            var formatString = {
                year: 'YYYY',
                quarter: 'YYYY-Q',
                month: 'YYYY-MM',
                week: 'YYYY-ww',
                day: 'YYYY-DDDD'
            };
            dataset[key] = moment(dataset.startTime)
                .format(formatString[key]);

            console.log(dataset[key]);

            return dataset;
        });
    }

    return _(datasetList).groupBy(keys[0]).mapValues(function (values) {
        return module.exports(values, keys.slice(1));
    }).value();

};
