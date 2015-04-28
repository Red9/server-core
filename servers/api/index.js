'use strict';

if (typeof process.env.NODE_ENV === 'undefined') {
    throw new Error('Must provide a NODE_ENV');
}

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('general', {file: 'config/general.json'})
    .file('deployment', {file: 'config/' + process.env.NODE_ENV + '.json'});

var Hapi = require('hapi');
var Joi = require('joi');
var models = require('./models');
var fs = require('fs');

// SSL TODO:
//  - Need to get certificate from authority.

exports.init = function (testing, doneCallback) {

    models.init(nconf, function () {

        var server = new Hapi.Server({
            connections: {
                routes: {
                    cors: {
                        origin: nconf.get('htmlOrigin'),
                        credentials: true
                    }
                }
            },
            cache: [
                {
                    name: 'redisCache', //By commenting, replace default cache
                    engine: require('catbox-redis'),
                    host: '127.0.0.1',
                    partition: 'cache'
                }
            ]
        });

        server.connection({
            host: nconf.get('listenIp'),
            port: nconf.get('port'),
            tls: {
                key: fs.readFileSync(nconf.get('ssl:keyPath')),
                cert: fs.readFileSync(nconf.get('ssl:certPath'))
            }
        });

        server.views({
            path: 'views',
            engines: {
                html: require('handlebars'),
                fcpxml: require('handlebars')
            },
            helpersPath: 'views/helpers',
            isCached: false
        });

        var plugins = [
            require('bell'),
            require('hapi-auth-cookie'),
            require('hapi-auth-bearer-token'),
            {
                register: require('hapi-swagger'),
                options: {
                    apiVersion: nconf.get('apiVersion'),
                    payloadType: 'form',
                    enableDocumentationPage: false
                }
            }

        ];

        if (!testing) {
            plugins.push({
                register: require('good'),
                options: {
                    opsInterval: 1000,
                    reporters: [
                        {
                            reporter: require('good-console'),
                            events: {
                                log: '*',
                                response: '*',
                                error: '*'
                            }
                        },
                        {
                            reporter: require('good-file'),
                            events: {
                                log: '*',
                                response: '*',
                                error: '*'
                            },
                            config: {
                                path: nconf.get('logFilePath')
                            }
                        }
                    ]
                }
            });
        }

        server.register(plugins, function (err) {
            if (err) {
                doneCallback(err);
            } else {
                require('./routes').init(server, models);
                doneCallback(null, server);
            }
        });
    });
};

if (!module.parent) {
    exports.init(false, function (err, server) {
        if (err) {
            console.log('Unknown error: ' + err);
            process.exit(1);
        } else {
            server.start(function () {
                if (err) {
                    console.log('Error starting goodConsole: ' + err);
                }

                server.log(['debug'], 'Server running at: ' + server.info.uri);
            });
        }
    });
}
