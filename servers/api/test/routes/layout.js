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

describe('layout resource', function () {
    var server;
    before(function (done) {
        sut.init(true, function (err, server_) {
            server = server_;
            done();
        });
    });

    var newLayout = {
        title: 'Lagoda',
        description: 'Whaling Bark',
        for: [
            '/dataset/:id'
        ],
        layout: []
    };

    var createdLayout;

    it('can create a layout', function (done) {
        server.inject({
            method: 'POST',
            url: '/layout/',
            payload: newLayout
        }, function (response) {

            expect(response.result).to.deep.include(newLayout);
            expect(response.result.id).to.exist();
            expect(response.result.createTime).to.exist();
            createdLayout = response.result;
            done();
        });
    });

    it('can get a layout', function (done) {
        server.inject({
            method: 'GET',
            url: '/layout/?idList=' + createdLayout.id
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.be.array().and.to.have.length(1).and.to.deep.include(createdLayout);
            done();
        });
    });

    it('can get a specific layout', function (done) {
        server.inject({
            method: 'GET',
            url: '/layout/' + createdLayout.id
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.be.deep.equal(createdLayout);
            done();
        });
    });

    it('does not get non-existent layouts', function (done) {
        server.inject({
            method: 'GET',
            url: '/layout/c853692c-7a3c-40f9-a05f-d0a01acab43b'
        }, function (response) {
            expect(response.result).to.include('statusCode');
            expect(response.statusCode).to.be.equal(404);
            done();
        });
    });

    it('can update a layout', function (done) {
        server.inject({
            method: 'PUT',
            url: '/layout/' + createdLayout.id,
            payload: {
                title: 'ABC'
            }
        }, function (response) {
            expect(response.result.title).to.equal('ABC');
            done();
        });
    });

    it('can delete a layout', function (done) {
        server.inject({
            method: 'DELETE',
            url: '/layout/' + createdLayout.id
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });
});



