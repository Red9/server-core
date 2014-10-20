var Hapi = require('hapi');
var Good = require('good');
var server = new Hapi.Server(3000);
var Joi = require('joi');


var resource = require('red9resource');
resource.init({
    cassandraHosts: ['localhost:9042'],
    cassandraKeyspace: 'dev'
});

var panelReaderConfig = {
    dataPath: '/home/clewis/consulting/red9/data-processing/rncvalidate',
    command: '/home/clewis/consulting/red9/data-processing/rncvalidate/build/rncvalidate'
};

//require('./routes/dataset').init(server, resource);
require('./routes/event').init(server, resource);
require('./routes/user').init(server, resource);
require('./routes/dataset').init(server, resource);

server.pack.register(Good, function (err) {

    server.pack.register({
            plugin: require('hapi-route-directory'),
            options: {
                path: '/'
            }
        },

        function (err) {
            if (err) {
                throw err;
            }

            /*server.pack.register({
             plugin: require('lout'),
             options: {
             endpoint: '/docsA'
             }
             }, function (err) {
             if (err) {
             console.log('Failed loading plugins');
             }*/

            server.pack.register({
                plugin: require('hapi-swagger'),
                apiVersion: "0.0.1"
            }, function (err) {
                if (err) {
                    console.log('Swagger err: ' + err);
                }
                server.start(function () {
                    console.log('Server running at:', server.info.uri);
                });
            });

//            });
        });
});