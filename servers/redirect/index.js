"use strict";

if (typeof process.env.NODE_ENV === 'undefined') {
    throw new Error('Must provide a NODE_ENV');
}

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('deployment', {file: 'config/' + process.env.NODE_ENV + '.json'});

var Hapi = require('hapi');

var server = new Hapi.Server();


var idMap = require(nconf.get('migrationMapPath'));

server.connection({
    host: nconf.get('listenIp'),
    port: nconf.get('port')
});


server.route({
    method: '*',
    path: '/{resource}/{id}',
    handler: function (request, reply) {
        if (request.params.resource === 'analysis') {
            if (idMap.dataset.hasOwnProperty(request.params.id)) { // Only redirect for IDs that mapped.
                reply().redirect(nconf.get('redirectUrl')
                + '/analysis'
                + '/' + idMap.dataset[request.params.id]
                + (request.url.search === null ? '' : request.url.search));
            } else {
                reply().redirect(nconf.get('redirectUrl'));
            }
        } else if (idMap.hasOwnProperty(request.params.resource)) {
            if (idMap[request.params.resource].hasOwnProperty(request.params.id)) {  // Only redirect for IDs that mapped.
                reply().redirect(nconf.get('redirectUrl')
                + '/' + request.params.resource
                + '/' + idMap[request.params.resource][request.params.id]
                + (request.url.search === null ? '' : request.url.search));
            } else {
                reply().redirect(nconf.get('redirectUrl'));
            }
        } else {
            reply().redirect(nconf.get('redirectUrl') + request.url.path);
        }
    }
});

server.route({
    method: '*',
    path: '/{anything*}',
    handler: function (request, reply) {
        reply().redirect(nconf.get('redirectUrl') + request.url.path);
    }
});


var plugins = [{
    register: require('good'),
    options: {
        opsInterval: 1000,
        reporters: [
            {
                reporter: require('good-console'),
                args: [{
                    log: '*',
                    response: '*',
                    error: '*'
                }]
            }
        ]
    }
}];

server.register(plugins, function (err) {
    if (err) {
        console.log('Plugin error: ' + err);
        process.exit(1);
    }
    server.start(function () {
        if (err) {
            console.log('Error starting server ' + err);
            process.exit(1);
        }
        server.log(['debug'], 'Server running at: ' + server.info.uri);
    });
});




