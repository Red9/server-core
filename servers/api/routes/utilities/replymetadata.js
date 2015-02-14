'use strict';

var hoek = require('hoek');

/**
 *
 * @param {Object} request
 * @param {Object} reply
 * @param {Object} data
 * @param {Object} [extraValues] Extra values to add to the metadata
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
