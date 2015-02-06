'use strict';

var hoek = require('hoek');

/** Standardized response for Red9 metadata format
 *
 * @param {Object} request Hapi request object
 * @param {Function} reply Hapi response function
 * @param {Object|Array} data The REST result resource object(s)
 * @param {Object} [extraValues] Extra key/values to add to the metadata
 */
module.exports = function (request, reply, data, extraValues) {

    var meta = {
        responseTime: (new Date()).getTime() - request.info.received
    };

    hoek.merge(meta, extraValues);

    if (request.query.metaformat === 'only') {
        reply({
            meta: meta
        });
    } else if (request.query.metaformat === 'none') {
        reply(data);
    } else {
        reply({
            meta: meta,
            data: data
        });
    }
};
