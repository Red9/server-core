'use strict';

var _ = require('lodash');

/**
 *
 * @param {Object} query The query string parameters from Hapi
 * @param {Object} searchObject The object of Joi validators that apply to the search
 * @returns {Object} Sequelize database where query
 */
module.exports = function (query, searchObject) {
    var filters = {};
    // Make sure that we only iterate over search keys
    _.each(_.pick(query, _.keys(searchObject)),
        function (value, key) {
            // This little hack works around the fact that we could have
            // two named id path parameters: /resource/:id, and ?id=...
            // It's mostly a server side hack for Angular's $Resource.
            // so, that's that.
            if (key === 'idList') {
                key = 'id';
            }

            // Search queries to Sequelize require Dates
            // for the timestamps. So we need to pull the metadata
            // about the search key and see if it's a timestamp. If it
            // is we'll preemptively convert it to a date here.
            // It's a bit hacky that we have to get index [0]. I suppose
            // that's a joi thing... We'll see if it bites me.

            var searchOptions = ['gt', 'lt', 'gte', 'lte'];
            var searchComparison;
            var searchJoi = searchObject[key];
            if (searchJoi.describe().meta) {
                if (searchJoi.describe().meta[0].timestamp === true) {
                    value = new Date(value);
                } else if (searchJoi.describe().meta[0].textSearch ===
                    true) {
                    searchComparison = 'ilike';
                    value = '%' + value + '%';
                }
            }

            var keyParts = key.split('.');
            if (searchOptions
                    .indexOf(keyParts[keyParts.length - 1]) !== -1) {
                searchComparison = keyParts[keyParts.length - 1];
                key = keyParts.slice(0, -1).join('.');
            }

            if (!searchComparison) {
                if (_.isArray(value)) {
                    filters[key] = {
                        overlap: value
                    };
                } else if (_.isString(value) &&
                    value.split(',').length > 1) { // CSV list
                    filters[key] = {
                        in: value.split(',')
                    };
                } else {
                    filters[key] = value;
                }
            } else if (searchComparison) {
                if (!filters.hasOwnProperty(key)) {
                    filters[key] = {};
                }
                filters[key][searchComparison] = value;
            }
        });
    return filters;
};
