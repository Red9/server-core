"use strict";

// default to development environment
if (typeof process.env.NODE_ENV === 'undefined') {
    process.env.NODE_ENV = 'development';
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
var routeHelp = require('./support/routehelp');

var server = Hapi.createServer(nconf.get('listenIp'), nconf.get('port'), {
    cors: {
        origin: [
            nconf.get('htmlOrigin')
        ],
        credentials: true
    }
});


resources.init({
    cassandraHosts: nconf.get('cassandraHosts'),
    cassandraKeyspace: nconf.get('cassandraKeyspace'),
    cassandraUsername: nconf.get('cassandraUsername'),
    cassandraPassword: nconf.get('cassandraPassword'),
    dataPath: nconf.get('rncDataPath')
}, function (err) {

    if (err) {
        console.log('Cassandra error: ' + err);
        process.exit(1);
    }

    server.pack.register([
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

    ], function (err) {
        if (err) {
            console.log('plugin err: ' + err);
        }

        require('./routes/authentication').init(server, resources); // Needs to be first

        routeHelp.createCRUDRoutes(server, resources.user);
        routeHelp.createCRUDRoutes(server, resources.event);
        routeHelp.createCRUDRoutes(server, resources.comment);
        routeHelp.createCRUDRoutes(server, resources.video);
        routeHelp.createCRUDRoutes(server, resources.layout);
        routeHelp.createCRUDRoutes(server, resources.dataset, ['read', 'update', 'delete', 'search', 'updateCollection']);

        require('./routes/dataset').init(server, resources);
        require('./routes/eventtype').init(server);


        server.start(function () {
            console.log('Server running at:', server.info.uri);
        });
    });

});