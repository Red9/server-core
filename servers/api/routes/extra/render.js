'use strict';

var _ = require('lodash');
var phantom = require('phantom');
var Boom = require('boom');
var Joi = require('joi');
var nconf = require('nconf');
var validators = require('../../support/validators');
var tmp = require('tmp');
var fs = require('fs');
var childProcess = require('child_process');

var globalToken = require('./authentication').globalToken;

exports.init = function (server) {

    // TODO: When upgrading to Node 0.12, change this to "execSync"
    // Safety check, since we require phantomjs 2.0, which has to be manually
    //   installed.
    childProcess.exec('phantomjs --version', {
        timeout: 1000
    }, function (err) {
        if (err) {
            server.log(['error'], 'phantomjs not found!');
            server.log(['error'], JSON.stringify(err));
            process.exit(1);
        }
    });

    var tmpDir = tmp.dirSync({unsafeCleanup: true}).name;

    server.log(['debug'], 'render tmp dir: ' + tmpDir);

    function renderPage(url, width, height, callback) {
        var filename = tmpDir + '/' + encodeURIComponent(url) + '.png';

        // Ignore SSL errors so that connection back to self work. Is this
        // safe? Should probably check. At the very least, it's a loop straight
        // on localhost with no outside parties. So probably safe to ignore.
        phantom.create('--ignore-ssl-errors=yes', function (ph) {

            ph.createPage(function (page) {
                page.set('viewportSize', {
                    width: width,
                    height: height
                });
                page.set('clipRect', {
                    top: 0,
                    left: 0,
                    width: width,
                    height: height
                });

                var outstandingResources = 0;

                function onPageReady() {
                    page.render(filename, function () {
                        fs.readFile(filename, function (err, fileBuffer) {
                            callback(err, fileBuffer);

                            // Clean up the rendered file
                            fs.unlink(filename, function () {
                            });
                        });

                        ph.exit();
                    });
                }

                page.onResourceRequested(
                    // This function executes in context of the PhantomJS
                    // system, So we don't actually have closure here. We need
                    // to pass in our variables
                    function (requestData, request, console, fromHost,
                              bearerToken, toPort) {
                        var match = requestData.url.match(fromHost);
                        if (match !== null) {
                            var newUrl = requestData.url.replace(fromHost,
                                '127.0.0.1:' + toPort);

                            request.changeUrl(newUrl);
                            request.setHeader('Authorization', 'Bearer ' +
                            bearerToken);
                        }
                    },
                    // This function executes in the local context.
                    function (requestData) {
                        outstandingResources++;
                    },
                    // These variables are passed in to the first function.
                    console,
                    nconf.get('apiUrl'),
                    globalToken,
                    nconf.get('port')
                );

                page.set('onResourceReceived', function (response) {
                    if (response.stage === 'end') {
                        outstandingResources--;
                    }
                });

                page.open(url, function (status) {
                    if (status !== 'success') {
                        callback(Boom.badImplementation(
                                'Failure to open target url ' + url)
                        );
                        return;
                    }

                    var noChangeInterval = 0;

                    function checkOutstandingResources() {
                        if (outstandingResources === 0) {
                            noChangeInterval++;
                            if (noChangeInterval ===
                                nconf.get('render:noChangeIntervalMax')) {
                                onPageReady();
                                return;
                            }
                        } else {
                            noChangeInterval = 0;
                        }
                        setTimeout(checkOutstandingResources,
                            nconf.get('render:checkPeriod'));
                    }

                    setTimeout(checkOutstandingResources,
                        nconf.get('render:checkPeriod'));
                });
            });
        });
    }

    var fragments = [
        {
            name: 'sessionshare',
            width: 950,
            height: 700,
            url: '/fragments/sessionshare/sessionshare.html',
            query: {
                datasetId: validators.id.required()
            },
            clientFilename: function (query) {
                return 'session_' + query.datasetId + '_share';
            },
            cache: {
                cache: 'redisCache',
                expiresIn: 1000 * 60 * 60 * 24, // 1 day
                staleIn: 1000 * 60, // 1 minute
                staleTimeout: 1 // Effectively, don't wait
            },
            clientCache: {
                expiresIn: 1000 * 60, // 1 minute
                privacy: 'private'
            }
        },
        {
            name: 'map',
            width: 1080,
            height: 720,
            url: '/fragments/map/map.html',
            query: {
                datasetId: validators.id.required()
            },
            clientFilename: function (query) {
                return 'map_' + query.datasetId;
            },
            cache: {
                cache: 'redisCache',
                expiresIn: 1000 * 60 * 60 * 24 * 30, // 1 month
                staleIn: 1000 * 60 * 3, // 3 minutes
                staleTimeout: 1 // Effectively, don't wait
            },
            clientCache: {
                expiresIn: 1000 * 60, // 1 minute
                privacy: 'private'
            }
        }
    ];

    _.each(fragments, function (fragment) {
        server.log(['debug'], 'Preparing fragment ' + fragment.name + ' route');

        // Each fragment gets it's own copy of the method so that we can have
        // different caching policies for each.
        server.method('renderPage' + fragment.name, renderPage, {
            cache: fragment.cache
        });

        server.route({
            method: 'GET',
            path: '/render/' + fragment.name,
            handler: function (request, reply) {
                var targetUrl = 'http://' + nconf.get('htmlUrl') + fragment.url;
                var queryString = '';
                _.each(request.query, function (value, key) {
                    if (queryString.length === 0) {
                        queryString = '?';
                    } else {
                        queryString += '&';
                    }
                    queryString += key + '=' + value;
                });
                targetUrl += queryString;

                server.methods['renderPage' + fragment.name](targetUrl,
                    fragment.width, fragment.height, function (err, result) {
                        if (err) {
                            reply(err);
                        } else {
                            var clientFilename =
                                fragment.clientFilename(request.query);
                            reply(new Buffer(result))
                                .header('Content-Type', 'image/png')
                                .header('Content-Disposition', 'filename="' +
                                clientFilename + '.png"');
                        }
                    });
            },
            config: {
                validate: {
                    query: fragment.query
                },
                description: 'something',
                notes: 'something',
                tags: ['api'],
                auth: {
                    scope: 'basic'
                },
                cache: fragment.clientCache
            }
        });
    });
};
