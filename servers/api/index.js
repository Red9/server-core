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

var models = require('./models');

exports.init = function (testing, doneCallback) {

    models.init(nconf);

    var server = new Hapi.Server({
        connections: {
            routes: {
                cors: {
                    origin: nconf.get('htmlOrigin'),
                    credentials: true
                }
            }
        }
    });

    server.connection({
        host: nconf.get('listenIp'),
        port: nconf.get('port')
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
        {
            register: require('hapi-swagger'),
            options: {
                apiVersion: nconf.get("apiVersion"),
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
                        args: [{
                            log: '*',
                            response: '*',
                            error: '*'
                        }]
                    },
                    {
                        reporter: require('good-file'),
                        args: [
                            {path: nconf.get('logFilePath')},
                            {
                                log: '*',
                                response: '*',
                                error: '*'
                            }
                        ]
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
