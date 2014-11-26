"use strict";

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
                utilities.createDataset(server, createdUser.id, function (err, createdDataset_) {
                    createdDataset = createdDataset_;
                    done();
                });
            });
        });
    });

    it('can create a minimal event', function (done) {
        var newEvent = {
            startTime: createdDataset.startTime + 100, // Make sure it passes validation by being within the dataset
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
            expect(response.result).to.deep.include(newEvent);
            expect(response.result.id).to.exist();
            expect(response.result.createTime).to.exist();
            createdEvent = response.result;
            done();
        });
    });

    it('can get a event', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/?idList=' + createdEvent.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.include(Object.keys(createdEvent)); // Summary statistics are still being calculated
            done();
        });
    });

    it('can get a specific event', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/' + createdEvent.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result).to.include(Object.keys(createdEvent));
            expect(response.result).to.include('duration');
            done();
        });
    });

    it('does not get non-existent events', function (done) {
        server.inject({
            method: 'GET',
            url: '/event/c853692c-7a3c-40f9-a05f-d0a01acab43b',
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
                datasetId: 'd21c7d0e-c2cd-43c4-b017-dc89ea99ebca',
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
    it('can update event', function (done) {
        server.inject({
            method: 'PUT',
            url: '/event/' + createdEvent.id,
            payload: {
                type: 'chances'
            },
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result.type).to.equal('chances');
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
            done();
        });
    });
});