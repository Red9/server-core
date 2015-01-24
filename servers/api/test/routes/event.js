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

var async = require('async');

var utilities = require('../utilities');

describe('event resource basics', function () {
    var server;
    var createdEvent;
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

    it('can create a minimal event', function (done) {
        var newEvent = {
            // Make sure it passes validation by being within the dataset
            startTime: createdDataset.startTime + 100,
            endTime: createdDataset.startTime + 1000,
            type: 'Wave',
            datasetId: createdDataset.id,
            source: {type: 'manual'}
        };
        server.inject({
            method: 'POST',
            url: '/event/',
            payload: newEvent,
            credentials: utilities.credentials.admin
        }, function (response) {
            createdEvent = JSON.parse(response.payload).data;

            expect(createdEvent).to.deep.include(newEvent);
            expect(createdEvent.id).to.exist();
            expect(createdEvent.createdAt).to.exist();
            expect(createdEvent.updatedAt).to.exist();

            done();
        });
    });

    it('can get a event', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/?idList=' + createdEvent.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.include(Object.keys(createdEvent));
            expect(payload[0]).to.include(
                [
                    'summaryStatistics',
                    'boundingBox',
                    'boundingCircle'
                ]);
            done();
        });
    });

    it('can get a specific event', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/' + createdEvent.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload).data;
            expect(payload).to.include(Object.keys(createdEvent));
            expect(payload).to.include('duration');
            done();
        });
    });

    it('does not get non-existent events', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/2',
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result).to.include('statusCode');
            expect(response.statusCode).to.be.equal(404);
            done();
        });
    });

    it('fails if checks do not pass', function (done) {
        var badEvents = [
            {
                // Bad datasetId
                startTime: createdDataset.startTime + 100,
                endTime: createdDataset.startTime + 1000,
                type: 'Wave',
                datasetId: '2',
                source: {type: 'manual'}
            },
            {
                // Bad startTime
                startTime: createdDataset.startTime - 100,
                endTime: createdDataset.startTime + 1000,
                type: 'Wave',
                datasetId: createdDataset.id,
                source: {type: 'manual'}
            },
            {
                // Bad endTime
                startTime: createdDataset.startTime + 100,
                endTime: createdDataset.endTime + 1000,
                type: 'Wave',
                datasetId: createdDataset.id,
                source: {type: 'manual'}
            },
            {
                // Bad startTime and endTime (endTime < startTime)
                startTime: createdDataset.startTime + 100,
                endTime: createdDataset.startTime + 99,
                type: 'Wave',
                datasetId: createdDataset.id,
                source: {type: 'manual'}
            },
            {
                // Bad source
                startTime: createdDataset.startTime + 100,
                endTime: createdDataset.startTime + 1000,
                type: 'Wave',
                datasetId: createdDataset.id,
                source: {type: 'wacky'}
            }

        ];

        async.each(badEvents,
            function (newEvent, callback) {
                server.inject({
                    method: 'POST',
                    url: '/event/',
                    payload: newEvent,
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
    it('events are immutable', function (done) {
        server.inject({
            method: 'PUT',
            url: '/event/' + createdEvent.id,
            payload: {
                type: 'chances'
            },
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.statusCode).to.equal(404);
            done();
        });
    });

    it('can delete events', function (done) {
        server.inject({
            method: 'DELETE',
            url: '/event/' + createdEvent.id,
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
