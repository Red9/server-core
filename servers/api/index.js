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

var resources = require('red9resource');
var routeHelp = require('./support/routehelp');

console.log('rncDataPath: ' + nconf.get('rncDataPath'));

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
    cassandraPassword: nconf.get('cassandraPassword')
}, function (err) {

    if (err) {
        console.log('Cassandra error: ' + err);
        process.exit(1);
    }

    server.pack.register([
        require('bell'),
        require('good'),
        require('hapi-auth-cookie'),
        {
            plugin: require('hapi-swagger'),
            apiVersion: nconf.get("apiVersion")
        }

    ], function (err) {
        if (err) {
            console.log('plugin err: ' + err);
        }

        routeHelp.createCRUDRoutes(server, resources.user);
        routeHelp.createCRUDRoutes(server, resources.event);
        routeHelp.createCRUDRoutes(server, resources.comment);
        routeHelp.createCRUDRoutes(server, resources.video);
        routeHelp.createCRUDRoutes(server, resources.layout);
        routeHelp.createCRUDRoutes(server, resources.dataset, ['read', 'update', 'delete', 'search']);

        require('./routes/dataset').init(server, resources);
        require('./routes/eventtype').init(server);
        require('./routes/authentication').init(server, resources);

        server.start(function () {
            console.log('Server running at:', server.info.uri);
        });
    });

});