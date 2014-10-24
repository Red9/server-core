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
var Good = require('good');
var Joi = require('joi');

var resource = require('red9resource');
var routeHelp = require('./support/routehelp');

console.log('rncDataPath: ' + nconf.get('rncDataPath'));

var server = Hapi.createServer('localhost', nconf.get('port'), {
    cors: {
        origin: [
            nconf.get('htmlOrigin')
        ],
        credentials: true
    }
});


resource.init({
    cassandraHosts: nconf.get('cassandraHosts'),
    cassandraKeyspace: nconf.get('cassandraKeyspace'),
    cassandraUsername: nconf.get('cassandraUsername'),
    cassandraPassword: nconf.get('cassandraPassword')
}, function (err) {

    if (err) {
        console.log('Cassandra error: ' + err);
        process.exit(1);
    }


    routeHelp.createCRUDRoutes(server, resource.user);
    routeHelp.createCRUDRoutes(server, resource.event);
    routeHelp.createCRUDRoutes(server, resource.comment);
    routeHelp.createCRUDRoutes(server, resource.video);
    routeHelp.createCRUDRoutes(server, resource.layout);
    routeHelp.createCRUDRoutes(server, resource.dataset, ['read', 'update', 'delete', 'search']);

    require('./routes/dataset').init(server, resource);

    server.pack.register([
        Good,
        {
            plugin: require('hapi-swagger'),
            apiVersion: nconf.get("apiVersion")
        }

    ], function (err) {
        if (err) {
            console.log('plugin err: ' + err);
        }
        server.start(function () {
            console.log('Server running at:', server.info.uri);
        });
    });

});