var nconf = require('nconf');
nconf
    .argv({
        'configPath': {
            describe: 'Specify path to a configuration file.',
            demand: true
        }
    })
    .env();

nconf.file('configurationFile', {file: nconf.get('configPath')});


var Hapi = require('hapi');
var Good = require('good');
var server = new Hapi.Server(nconf.get('port'));
var Joi = require('joi');

var resource = require('red9resource');
var routeHelp = require('./support/routehelp');


resource.init({
    cassandraHosts: nconf.get('cassandraHosts'),
    cassandraKeyspace: nconf.get('cassandraKeyspace')//,
    // TODO(SRLM): Need to add in username and password
//    cassandraUsername: nconf.get('cassandraUsername'),
//    cassandraPassword: nconf.get('cassandraPassword')
}, function (err) {

    if(err){
        console.log('Cassandra error: ' + err);
        process.exit(1);
    }

    //require('./routes/event').init(server, resource);
    //require('./routes/user').init(server, resource);
    routeHelp.createCRUDRoutes(server, resource.user);
    routeHelp.createCRUDRoutes(server, resource.event);
    routeHelp.createCRUDRoutes(server, resource.comment);
    routeHelp.createCRUDRoutes(server, resource.video);
    routeHelp.createCRUDRoutes(server, resource.layout);


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