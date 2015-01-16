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


    var plugins = [
        require('bell'),
        require('hapi-auth-cookie'),
        {
            register: require('hapi-swagger'),
            options: {
                apiVersion: nconf.get("apiVersion"),
                payloadType: 'form'
            }
        }

    ];

    if (!testing) {
        // Add in the plugins that we do not want to test with
        plugins.push({
            register: require('good'),
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
                server.log(['debug'], 'Server running at: ' + server.info.uri);
            });
        }
    });
}