'use strict';

var _ = require('lodash');

module.exports = function (sortOptions, query) {
    var result = {
        offset: query.offset,
        limit: query.limit
    };

    if (_.has(query, 'sort')) {

        var sortDirection = query.sortDirection ? query.sortDirection : 'desc';

        var match = _.find(sortOptions, function (sortOption) {
            return sortOption === query.sort || // is it a straight up key
                sortOption.key === query.sort; // or an search object?
        });

        result.order = [];

        if (_.isString(match)) {
            result.order.push([
                match,
                sortDirection
            ]);
        } else {
            result.order.push([
                match.orderFunction,
                sortDirection
            ]);
        }
    }

    return result;
};
