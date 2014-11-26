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

var utilities = require('../utilities');

describe('user resource basics', function () {
    var server;
    before(function (done) {
        sut.init(true, function (err, server_) {
            server = server_;
            done();
        });
    });

    var newUser = {
        email: 'you@me.com'
    };

    var createdUser;

    it('can create a minimal user', function (done) {
        server.inject({
            method: 'POST',
            url: '/user/',
            payload: newUser,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.deep.include(newUser);
            expect(payload.id).to.exist();
            expect(payload.createTime).to.exist();
            expect(payload.preferredLayout).to.exist().and.to.be.object();
            createdUser = payload;
            done();
        });
    });

    it('can get a user', function (done) {
        server.inject({
            method: 'GET',
            url: '/user/?idList=' + createdUser.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.deep.include(createdUser);
            done();
        });
    });

    it('can get a specific user', function (done) {
        server.inject({
            method: 'GET',
            url: '/user/' + createdUser.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.deep.include(createdUser);
            done();
        });
    });

    it('does not get non-existent users', function (done) {
        server.inject({
            method: 'GET',
            url: '/user/c853692c-7a3c-40f9-a05f-d0a01acab43b',
            credentials: utilities.credentials.admin
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.include('statusCode');
            expect(payload.statusCode).to.be.equal(404);
            done();
        });
    });

    it('can update user', function (done) {
        server.inject({
            method: 'PUT',
            url: '/user/' + createdUser.id,
            payload: {
                displayName: 'Jon'
            },
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.result.displayName).to.equal('Jon');
            done();
        });
    });

    it('can delete users', function (done) {
        server.inject({
            method: 'DELETE',
            url: '/user/' + createdUser.id,
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });
});

describe('user detailed tests', function () {
    var server;
    before(function (done) {
        sut.init(true, function (err, server_) {
            server = server_;
            done();
        });
    });

    it('checks to make sure the email is not in use before creating new user', function (done) {
        var newUser = {
            email: 'first@user.com'
        };

        server.inject({
            method: 'POST',
            url: '/user/',
            payload: newUser,
            credentials: utilities.credentials.admin
        }, function (response) {
            expect(response.statusCode).to.equal(200);

            server.inject({
                method: 'POST',
                url: '/user/',
                payload: newUser,
                credentials: utilities.credentials.admin
            }, function (response2) {
                expect(response2.statusCode).to.equal(400);
                done();
            });
        });
    });
});

