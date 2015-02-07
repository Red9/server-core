'use strict';

var _ = require('lodash');

module.exports = function (query) {
    var result = {
        offset: query.offset,
        limit: query.limit
    };

    if (_.has(query, 'sort')) {
        var sortDirection = query.sortDirection ? query.sortDirection : 'desc';

        result.order = [[query.sort, sortDirection]];
    }



    console.dir(result);

    return result;
};