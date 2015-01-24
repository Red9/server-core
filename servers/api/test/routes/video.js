'use strict';

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../../index';
var sut = require(requirePath);

var utilities = require('../utilities');
var async = require('async');

describe('video resource basics', function () {
    var server;
    var createdVideo;
    var createdUser;
    var createdDataset;

    before(function (done) {
        sut.init(true, function (err, server_) {
            server = server_;
            utilities.createUser(server, function (err, createdUser_) {
                createdUser = createdUser_;
                utilities.createDataset(server, createdUser.id,
                    function (err, createdDataset_) {
                        createdDataset = createdDataset_;
                        done();
                    });
            });
        });
    });

    it('can create a minimal video', function (done) {
        var newVideo = {
            startTime: createdDataset.startTime + 100,
            host: 'YouTube',
            hostId: 'ABC',
            datasetId: createdDataset.id
        };

        server.inject({
            method: 'POST',
            url: '/video/',
            payload: newVideo,
            credentials: utilities.credentials.admin
        }, function (response) {
            createdVideo = JSON.parse(response.payload).data;
            expect(createdVideo).to.deep.include(newVideo);
            expect(createdVideo.id).to.exist();
            expect(createdVideo.createdAt).to.exist();
            expect(createdVideo.updatedAt).to.exist();
            done();
        });
    });

    it('can get a video', function (done) {
        server.inject({
            method: 'GET',
            url: '/video/?idList=' + createdVideo.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.deep.include(createdVideo);
            done();
        });
    });

    it('can get a specific video', function (done) {
        server.inject({
            method: 'GET',
            url: '/video/' + createdVideo.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.deep.include(createdVideo);
            done();
        });
    });

    it('does not get non-existent videos', function (done) {
        server.inject({
            method: 'GET',
            url: '/video/2',
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result).to.include('statusCode');
            expect(response.statusCode).to.be.equal(404);
            done();
        });
    });

    it('fails if checks do not pass', function (done) {
        var badVideos = [
            {
                // Bad host
                startTime: createdDataset.startTime + 100,
                host: 'Dawn Soap',
                hostId: 'ABC',
                datasetId: createdDataset.id
            },
            {
                // Bad dataset ID
                startTime: createdDataset.startTime + 100,
                host: 'YouTube',
                hostId: 'ABC',
                datasetId: '2'
            },
            {
                // Bad startTime
                startTime: createdDataset.endTime + 100,
                host: 'YouTube',
                hostId: 'ABC',
                datasetId: createdDataset.id
            }
        ];

        async.each(badVideos,
            function (newVideo, callback) {
                server.inject({
                    method: 'POST',
                    url: '/video/',
                    payload: newVideo,
                    credentials: utilities.credentials.admin
                }, function (response) {
                    expect(response.statusCode).to.equal(400);
                    callback();
                });
            },
            function () {
                done();
            });
    });

    // -----------------------------------------------------
    // Modifications
    // -----------------------------------------------------
    it('can update video', function (done) {
        server.inject({
            method: 'PUT',
            url: '/video/' + createdVideo.id,
            payload: {
                hostId: 'DEF'
            },
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload.hostId).to.equal('DEF');
            done();
        });
    });

    it('can delete videos', function (done) {
        server.inject({
            method: 'DELETE',
            url: '/video/' + createdVideo.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.statusCode).to.equal(200);

            // It should NOT delete the associated resources
            async.each([
                    '/dataset/' + createdDataset.id,
                    '/user/' + createdUser.id
                ], function (url, callback) {
                    server.inject({
                        method: 'GET',
                        url: url,
                        credentials: utilities.credentials.admin
                    }, function (response) {
                        expect(response.statusCode).to.equal(200);
                        callback(null);
                    });
                },
                function (err) {
                    expect(err).to.be.undefined();
                    done();
                });

            done();
        });
    });
});
