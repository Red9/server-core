'use strict';

var fs = require('fs');
var marked = require('marked');
var highlight = require('highlight.js');

function getMarkDownHTML(path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
        if (!err) {
            data = marked(data);
        }
        callback(err, data);
    });
}

module.exports.init = function (server) {

    // Synchronous highlighting with highlight.js
    marked.setOptions({
        highlight: function (code, language) {
            if (language) {
                return highlight.highlight(language, code).value;
            } else {
                return code;
            }
        }
    });

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
