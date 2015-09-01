'use strict';

module.exports.init = function (server) {

    server.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply({'message': 'Hello'});
        },
        config: {
            auth: false
        }
    });
};
