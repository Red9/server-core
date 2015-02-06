'use strict';

var Boom = require('boom');

/** Helper to create a consistent "Not Found" error response.
 *
 * @param {Object} route Red9 route description
 * @param {Object} request Hapi request object
 * @returns {Object} Boom error
 */
module.exports = function notFoundError(route, request) {
    return Boom.notFound(route.name + ' ' + request.params.id + ' not found');
};
