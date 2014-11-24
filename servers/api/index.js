"use strict";

if (typeof process.env.NODE_ENV === 'undefined') {
    throw new Error('Must provide a NODE_ENV');
}

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('general', {file: 'config/general.json'})
    .file('deployment', {file: 'config/' + process.env.NODE_ENV + '.json'})
    .file('common', {file: '../config/' + process.env.NODE_ENV + '.json'});

var Hapi = require('hapi');
var Joi = require('joi');

var resources = require('./resources/index');
var routeTemplate = require('./support/routetemplate');

exports.init = function (testing, doneCallback) {

    var server = Hapi.createServer(nconf.get('listenIp'), nconf.get('port'), {
        cors: {
            origin: [
                nconf.get('htmlOrigin')
            ],
            credentials: true
        }
    });


    resources.init(server, function (err) {
        if (err) {
            server.log(['error'], 'Resources error: ' + err);
            process.exit(1);
        }

        var plugins = [
            require('bell'),
            require('hapi-auth-cookie'),
            {
                plugin: require('good'),
                options: {
                    reporters: [
                        {
                            reporter: require('good-console'),
                            args: [{
                                log: '*',
                                request: '*',
                                error: '*'
                            }]
                        },
                        {
                            reporter: require('good-file'),
                            args: [
                                nconf.get('logFilePath'),
                                {
                                    log: '*',
                                    request: '*',
                                    error: '*'
                                }]
                        }
                    ]
                }
            },
            {
                plugin: require('hapi-swagger'),
                options: {
                    apiVersion: nconf.get("apiVersion"),
                    payloadType: 'form'
                }
            }

        ];

        if (testing) {
            plugins = [];
        }

        server.pack.register(plugins, function (err) {
            if (err) {
                doneCallback(err);
                return;
            }

            if (!testing) {
                require('./routes/authentication').init(server, resources); // Needs to be first
            }

            routeTemplate.createCRUDRoutes(server, resources.user);
            routeTemplate.createCRUDRoutes(server, resources.event);
            routeTemplate.createCRUDRoutes(server, resources.comment);
            routeTemplate.createCRUDRoutes(server, resources.video);
            routeTemplate.createCRUDRoutes(server, resources.layout);
            routeTemplate.createCRUDRoutes(server, resources.dataset, ['read', 'update', 'delete', 'search', 'updateCollection']);

            require('./routes/dataset').init(server, resources);
            require('./routes/eventtype').init(server);

            if (!testing) {
                server.start(function () {
                    server.log(['debug'], 'Server running at: ' + server.info.uri);
                    doneCallback(null, server);
                });
            } else {
                doneCallback(null, server);
            }
        });
    });
};

if (!module.parent) {
    exports.init(false, function (err) {
        if (err) {
            console.log('Unknown error: ' + err);
            process.exit(1);
        }
    });
}


