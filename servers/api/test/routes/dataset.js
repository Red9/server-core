"use strict";

var Code = require('code');
var Lab = require('lab');
var lab = exports.lab = Lab.script();

var async = require('async');

var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

var requirePath = '../../index';
var sut = require(requirePath);

var _ = require('underscore')._;

var utilities = require('../utilities');

var nconf = require('nconf');
var fs = require('fs');
var path = require('path');

var FormData = require('form-data');
var streamToPromise = require('stream-to-promise');

var rncName = 'data_a.RNC';

describe('dataset resource basics', function () {
    var server;
    var createdDataset;
    var createdUser;
    var createdComment;
    var createdVideo;
    var createdEvent;
    var newDataset;


    before(function (done) {
        sut.init(true, function (err, server_) {
            server = server_;
            utilities.createUser(server, function (err, createdUser_) {
                createdUser = createdUser_;
                newDataset = {
                    resourceType: 'dataset',
                    resourceId: 'd21c7d0e-c2cd-43c4-b017-dc89ea99ebca',
                    authorId: createdUser.id,
                    body: 'Keeps the fire from burning out'
                };
                done();
            });
        });
    });

    it('can create a minimal dataset', function (done) {
        var rncStream = fs.createReadStream(path.join(nconf.get('testDataPath'), rncName));

        var form = new FormData();
        form.append('title', 'test');
        form.append('ownerId', createdUser.id);
        form.append('rnc', rncStream);
        streamToPromise(form).then(function (payload) {
            server.inject({
                method: 'POST',
                url: '/dataset/',
                payload: payload,
                headers: form.getHeaders()
            }, function (response) {
                expect(response.result.id).to.exist();
                expect(response.result.createTime).to.exist();
                createdDataset = response.result;

                // Go ahead and create some associated resources for use later
                async.series([
                    function (callback) {
                        utilities.createEvent(server,
                            createdDataset.id,
                            createdDataset.startTime + 100,
                            createdDataset.startTime + 1000,
                            callback);
                    },
                    function (callback) {
                        utilities.createComment(server,
                            createdDataset.id,
                            createdUser.id,
                            callback);
                    },
                    function (callback) {
                        utilities.createVideo(server,
                            createdDataset.id,
                            callback);
                    }
                ], function (err, results) {
                    expect(err).to.be.undefined();
                    createdEvent = results[0];
                    createdComment = results[1];
                    createdVideo = results[2];
                    done();
                });
            });
        });
    });

    it('can get a dataset', function (done) {
        server.inject({
            method: 'GET',
            url: '/dataset/?idList=' + createdDataset.id
        }, function (response) {
            var payload = JSON.parse(response.payload);
            expect(payload).to.be.array();
            expect(payload).to.have.length(1);
            expect(payload[0]).to.deep.include(Object.keys(createdDataset));
            done();
        });
    });

    it('can get a specific dataset', function (done) {
        server.inject({
            method: 'GET',
            url: '/dataset/' + createdDataset.id
        }, function (response) {
            expect(response.result).to.include(Object.keys(createdDataset));
            done();
        });
    });

    it('does not get non-existent datasets', function (done) {
        server.inject({
            method: 'GET',
            url: '/dataset/c853692c-7a3c-40f9-a05f-d0a01acab43b'
        }, function (response) {
            expect(response.result).to.include('statusCode');
            expect(response.statusCode).to.be.equal(404);
            done();
        });
    });

    it('fails if owner id does not exist', function (done) {
        var rncStream = fs.createReadStream(path.join(nconf.get('testDataPath'), rncName));

        var form = new FormData();
        form.append('title', 'test');
        form.append('ownerId', 'c853692c-7a3c-40f9-a05f-d0a01acab43b');
        form.append('rnc', rncStream);
        streamToPromise(form).then(function (payload) {
            server.inject({
                method: 'POST',
                url: '/dataset/',
                payload: payload,
                headers: form.getHeaders()
            }, function (response) {
                expect(response.statusCode).to.equal(400);
                done();
            });
        });
    });

    it('can expand properly', function (done) {
        server.inject({
            method: 'GET',
            url: '/dataset/' + createdDataset.id + '?expand=owner&expand=event&expand=video&expand=comment&expand=count'
        }, function (response) {
            expect(response.result).to.include(Object.keys(createdDataset));
            expect(response.result.owner).to.deep.include(createdUser);
            expect(response.result.event).to.deep.include([createdEvent]); // Include instead of equal since the event has summary statistics, which (at this point in the testing time) is still being calculated.
            expect(response.result.comment).to.deep.equal([createdComment]);
            expect(response.result.video).to.deep.equal([createdVideo]);
            expect(response.result.count).to.deep.equal({
                event: 1,
                video: 1,
                comment: 1
            });
            done();
        });
    });

    it('can add to tags', function (done) {
        server.inject({
            method: 'PUT',
            url: '/dataset/' + createdDataset.id + '/tags',
            payload: {
                tags: ['hello']
            }
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    it('can remove tags', function (done) {
        server.inject({
            method: 'PATCH',
            url: '/dataset/' + createdDataset.id + '/tags',
            payload: {
                tags: ['hello']
            }
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    // -----------------------------------------------------
    // Panel stuff
    // -----------------------------------------------------

    it('can read panel CSV with no special options', function (done) {
        server.inject({
            method: 'GET',
            url: '/dataset/' + createdDataset.id + '/csv'
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            expect(_.isString(response.result)).to.be.true();
            done();
        });
    });

    it('can read panel CSV with special options', function (done) {
        var axes = ['time', 'acceleration:x', 'gps:speed'];
        server.inject({
            method: 'GET',
            url: '/dataset/' + createdDataset.id
            + '/csv?csPeriod=1000&axes=' + axes.join(',')
            + '&startTime=' + (createdDataset.startTime + 1500)
            + '&endTime=' + (createdDataset.endTime - 1500)
        }, function (response) {
            expect(response.statusCode).to.equal(200);
            expect(_.isString(response.result)).to.be.true();

            var payload = response.payload.split('\n');
            expect(payload[0].split(',')).to.include(axes);

            done();
        });
    });

    // Commented out since it's not really a meaningful test, and
    // the R script errored out on such a short panel.
    //it('can run event finder', function (done) {
    //    server.inject({
    //        method: 'POST',
    //        url: '/dataset/' + createdDataset.id + '/eventfind'
    //    }, function (response) {
    //        expect(response.statusCode).to.equal(200);
    //        done();
    //    });
    //});

    // -----------------------------------------------------
    // Modifications
    // -----------------------------------------------------
    it('can update dataset', function (done) {
        server.inject({
            method: 'PUT',
            url: '/dataset/' + createdDataset.id,
            payload: {
                title: 'chances'
            }
        }, function (response) {
            expect(response.result.title).to.equal('chances');
            done();
        });
    });

    it('can delete datasets along with associated resources', function (done) {

        server.inject({
            method: 'DELETE',
            url: '/dataset/' + createdDataset.id
        }, function (response) {
            expect(response.statusCode).to.equal(200);

            // It should also delete the associated resources
            async.each([
                    '/event/' + createdEvent.id,
                    '/comment/' + createdComment.id,
                    '/video/' + createdVideo.id
                ], function (url, callback) {
                    server.inject({
                        method: 'GET',
                        url: url
                    }, function (response) {
                        expect(response.statusCode).to.equal(404);
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