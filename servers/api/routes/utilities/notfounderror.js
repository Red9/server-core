'use strict';

var Boom = require('boom');

module.exports = function notFoundError(route, request) {
    return Boom.notFound(route.name + ' ' + request.params.id + ' not found');
};
