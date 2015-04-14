'use strict';

var _ = require('lodash');
var phantom = require('phantom');
var Boom = require('boom');
var Joi = require('joi');
var nconf = require('nconf');
var validators = require('../../support/validators');
var tmp = require('tmp');
var fs = require('fs');
var child_process = require('child_process');

exports.init = function (server) {

    // TODO: When upgrading to Node 0.12, change this to "execSync"
    // Safety check, since we require phantomjs 2.0, which has to be manually
    //   installed.
    child_process.exec('phantomjs --version', {
        timeout: 1000
    }, function (err) {
        if (err) {
            console.log('phantomjs not found!');
            console.dir(err);
            process.exit(1);
        }
    });

    var tmpDir = tmp.dirSync({unsafeCleanup: true}).name;
    console.log('render tmp dir: ' + tmpDir);

    function renderPage(request, reply, url, width, height, clientFilename) {
        var filename = tmpDir + '/' + encodeURIComponent(url) + '.png';

        phantom.create(function (ph) {
            // Copy the cookies over to the new requests.
            _.each(request.headers.cookie.split('; '), function (cookie) {
                var parts = cookie.split('=');
                //console.log('Adding cookie "' + parts[0] + '" === "' + parts[1] + '"');
                ph.addCookie(
                    parts[0], // name
                    parts[1], // value
                    nconf.get('cookie:domain')
                );
            });

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
                        console.log('Done rendering file to ' + filename);
                        reply.file(filename)
                            .header('Content-Disposition', 'filename="' + clientFilename + '.png"');

                        ph.exit();

                        // Clean up the rendered file. But wait! Literally. The
                        //   reply handler takes time to execute, and if we
                        //   immediately delete the image then the reply()
                        //   returns with a 404. So give it plenty of time.
                        setTimeout(function () {
                            fs.unlink(filename, function () {
                            });
                        }, 10000);
                    });
                }

                page.set('onResourceRequested', function () {
                    outstandingResources++;
                });

                page.set('onResourceReceived', function (response) {
                    if (response.stage === 'end') {
                        outstandingResources--;
                    }
                });

                page.open(url, function (status) {
                    if (status !== 'success') {
                        reply(Boom.badImplementation('Failure to open target url ' + url));
                        return;
                    }

                    var noChangeInterval = 0;

                    function checkOutstandingResources() {
                        if (outstandingResources === 0) {
                            noChangeInterval++;
                            if (noChangeInterval === nconf.get('render:noChangeIntervalMax')) {
                                onPageReady();
                                return;
                            }
                        } else {
                            noChangeInterval = 0;
                        }
                        setTimeout(checkOutstandingResources, nconf.get('render:checkPeriod'));
                    }

                    setTimeout(checkOutstandingResources, nconf.get('render:checkPeriod'));
                });
            });
        });
    }


    var fragments = [{
        name: 'sessionshare',
        width: 950,
        height: 700,
        url: '/fragments/sessionshare/sessionshare.html',
        query: {
            datasetId: validators.id.required()
        },
        clientFilename: function (query) {
            return 'session_' + query.datasetId + '_share';
        }
    }];

    _.each(fragments, function (fragment) {
        console.log('Setting up fragment ' + fragment.name + ' route');
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

                renderPage(request, reply, targetUrl, fragment.width, fragment.height, fragment.clientFilename(request.query));
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
                }
            }
        });
    });
};
