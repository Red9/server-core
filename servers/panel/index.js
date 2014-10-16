var Hapi = require('hapi');
var Good = require('good');
var server = new Hapi.Server(3000);
var Joi = require('joi');

var panelReaderConfig = {
    dataPath: '/home/clewis/consulting/red9/data-processing/rncvalidate',
    command: '/home/clewis/consulting/red9/data-processing/rncvalidate/build/rncvalidate'
};

var panel = require('red9panel').panelReader(panelReaderConfig);

server.route({
    method: 'POST',
    path: '/dataset/',
    config: {
        payload: {
            maxBytes: 1024 * 1024 * 200,
            output: 'stream',
            parse: true
        },
        handler: function (request, reply) {


            var filename = request.payload['rnc'].hapi.filename;
            reply('Thanks');
            //request.payload['rnc'].pipe(fs.createWriteStream('upload'));
        }
    }
});

// This second regex (after the OR) is a legacy option!!! As it turns out, I haven't been using version 4
var idValidator = Joi.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$$/);

server.route({
    method: 'GET',
    path: '/dataset/{id}/csv',
    handler: function (request, reply) {
        var resultStream = panel.readPanelCSV('B39F36');
        reply(resultStream);
        //reply('Thanks for your input: ' + request.params.id + ', ' + request.query.startTime);
    },
    config: {
        validate: {
            params: {
                id: idValidator
            },
            query: {
                startTime: Joi.number().integer().min(0),
                endTime: Joi.number().integer().min(0),
                axes: Joi.string(),
                frequency: Joi.number().integer().min(1).max(1000)
            }
        }
    }
});

server.route({
    method: 'GET',
    path: '/dataset/{id}/json',
    handler: function (request, reply) {
        reply('Thanks for your input: ' + request.params.id + ', ' + request.query.startTime);
    },
    config: {
        validate: {
            params: {
                id: idValidator
            },
            query: {
                startTime: Joi.number().integer().min(0),
                endTime: Joi.number().integer().min(0),
                axes: Joi.string(),
                buckets: Joi.number().integer().min(1).max(10000),
                minmax: Joi.boolean()
                // TODO (SRLM): Add
                // - parts: panel, spectral, fft, distribution, comparison, ...
            }
        }
    }
});


server.route({
    method: 'GET',
    path: '/stream',
    handler: function (request, reply) {
        var outputStream = require('stream').Readable();
        outputStream._read = function (size) {
            setTimeout(function () {
                console.log('_read size: ' + size);
                outputStream.push('Stream Output\n');
                outputStream.push(null);
            }, 1000);
        };

        reply(outputStream);
    }
});


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
            server.start(function () {
                console.log('Server running at:', server.info.uri);
            });
        }
    );
});