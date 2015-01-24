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

describe('comment resource basics', function () {
    var server;
    var createdComment;
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

    it('can create a minimal comment', function (done) {
        var newComment = {
            datasetId: createdDataset.id,
            userId: createdUser.id,
            body: 'Keeps the fire from burning out'
        };
        server.inject({
            method: 'POST',
            url: '/comment/',
            payload: newComment,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(response.statusCode).to.equal(200);
            expect(payload).to.deep.include(newComment);
            expect(payload.id).to.exist();
            expect(payload.createdAt).to.exist();
            expect(payload.updatedAt).to.exist();
            createdComment = payload;
            done();
        });
    });

    it('can get a comment', function (done) {
        server.inject({
            method: 'GET',
            url: '/comment/?idList=' + createdComment.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.deep.include(createdComment);
            done();
        });
    });

    it('can get a specific comment', function (done) {
        server.inject({
            method: 'GET',
            url: '/comment/' + createdComment.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.deep.include(createdComment);
            expect(payload).to.include('bodyHtml');
            done();
        });
    });

    it('does not get non-existent comments', function (done) {
        server.inject({
            method: 'GET',
            url: '/comment/2',
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result).to.include('statusCode');
            expect(response.statusCode).to.be.equal(404);
            done();
        });
    });

    it('fails if checks do not pass', function (done) {
        var badComments = [
            {
                // Bad userId
                datasetId: createdDataset.id,
                userId: '12345',
                body: 'Non existent user id'
            },
            {
                // Bad datasetId
                datasetId: '123',
                userId: createdUser.id,
                body: 'Bad dataset id'
            },
            {
                // Bad startTime
                datasetId: createdDataset.id,
                userId: createdUser.id,
                body: 'Keeps the fire from burning out',
                startTime: createdDataset.startTime - 10,
                endTime: createdDataset.startTime + 100
            },
            {
                // Bad endTime
                datasetId: createdDataset.id,
                userId: createdUser.id,
                body: 'Keeps the fire from burning out',
                startTime: createdDataset.startTime + 10,
                endTime: createdDataset.endTime + 100
            },
            {
                // Bad startTime and endTime combination
                datasetId: createdDataset.id,
                userId: createdUser.id,
                body: 'Keeps the fire from burning out',
                startTime: createdDataset.startTime + 100,
                endTime: createdDataset.startTime + 50
            },
            {
                // Bad body
                datasetId: createdDataset.id,
                userId: createdUser.id,
                body: ''
            }
        ];

        async.each(badComments,
            function (badComments, callback) {
                server.inject({
                    method: 'POST',
                    url: '/comment/',
                    payload: badComments,
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

    it('can expand properly', function (done) {
        server.inject({
            method: 'GET',
            url: '/comment/' + createdComment.id + '?expand[]=user',
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.deep.include(createdComment);
            expect(payload.user).to.deep.include(createdUser);
            done();
        });
    });

    // -----------------------------------------------------
    // Modifications
    // -----------------------------------------------------
    it('can update comment', function (done) {
        server.inject({
            method: 'PUT',
            url: '/comment/' + createdComment.id,
            payload: {
                body: 'chances'
            },
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload.body).to.equal('chances');
            done();
        });
    });

    it('can delete comments', function (done) {
        server.inject({
            method: 'DELETE',
            url: '/comment/' + createdComment.id,
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
        });
    });
});
