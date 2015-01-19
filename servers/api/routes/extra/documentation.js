"use strict";

var fs = require('fs');
var markdown = require('markdown').markdown;

function getMarkDownHTML(path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (!err) {
            data = markdown.toHTML(data);
        }
        callback(err, data);
    });
}

module.exports.init = function (server) {

    server.route({
        method: 'GET',
        path: '/documentation',
        handler: function (request, reply) {
            getMarkDownHTML('README.md', function (err, readme) {
                getMarkDownHTML('CHANGELOG.md', function (err, changelog) {
                    reply.view('swagger/template.html', {
                        title: 'Red9 API Calculator',
                        readme: readme,
                        changelog: changelog
                    });
                });
            });
        }
    });

    server.route({
        method: 'GET',
        path: '/documentation/{path*}',
        handler: {
            directory: {
                path: './views/swagger/public',
                listing: false,
                index: true
            }
        }
    });
};