"use strict";

var nconf = require('nconf');
var fs = require('fs');
var path = require('path');

var FormData = require('form-data');
var streamToPromise = require('stream-to-promise');

var rncName = 'data_a.RNC';

var credentials = {
    admin: {
        id: '69d6fe95-823d-44b8-bd17-b8850772956e',
        email: 'admin@test.com',
        scope: ['basic', 'trusted', 'admin']
    },
    trusted: {
        id: '7851f7e7-2828-4332-a755-056c42e18e3a',
        email: 'trusted@test.com',
        scope: ['basic', 'trusted']
    },
    basic: {
        id: '980f5258-1774-4d5e-bfdb-9c868e571eab',
        email: 'basic@test.com',
        socpe: ['basic']
    }

};
exports.credentials = credentials;


exports.createDataset = function (server, userId, doneCallback) {
    var rncStream = fs.createReadStream(path.join(nconf.get('testDataPath'), rncName));

    var form = new FormData();
    form.append('title', 'test');
    form.append('ownerId', userId);
    form.append('rnc', rncStream);
    streamToPromise(form).then(function (payload) {
        server.inject({
            method: 'POST',
            url: '/dataset/',
            payload: payload,
            headers: form.getHeaders(),
            credentials: credentials.admin
        }, function (response) {
            server.inject({
                method: 'GET',
                url: '/dataset/' + response.result.id,
                credentials: credentials.admin
            }, function (response2) {
                doneCallback(null, response2.result);
            });
        });
    });
};

/**
 *
 * @param server {Object}
 * @param resourceURL {string}
 * @param newResource {Object}
 * @param callback {Function}
 */
function createResource(server, resourceURL, newResource, callback) {
    server.inject({
        method: 'POST',
        url: resourceURL,
        payload: newResource,
        credentials: credentials.admin
    }, function (response) {
        server.inject({
            method: 'GET',
            url: resourceURL + response.result.id,
            credentials: credentials.admin
        }, function (response2) {
            callback(null, response2.result);
        });
    });
}

exports.createLayout = function (server, doneCallback) {
    var newLayout = {
        title: 'Lagoda',
        description: 'Whaling Bark',
        for: [
            '/dataset/:id'
        ],
        layout: []
    };
    createResource(server, '/layout/', newLayout, doneCallback);
};

exports.createUser = function (server, doneCallback) {
    var newUser = {
        email: new Date().getTime() + '@mytime.com'
    };
    createResource(server, '/user/', newUser, doneCallback);
};

exports.createVideo = function (server, datasetId, doneCallback) {
    var newVideo = {
        startTime: 0,
        host: 'YouTube',
        hostId: 'ABC',
        datasetId: datasetId
    };
    createResource(server, '/video/', newVideo, doneCallback);
};

exports.createComment = function (server, datasetId, userId, doneCallback) {
    var newComment = {
        resourceType: 'dataset',
        resourceId: datasetId,
        authorId: userId,
        body: 'Hello, world'
    };
    createResource(server, '/comment/', newComment, doneCallback);
};

exports.createEvent = function (server, datasetId, startTime, endTime, doneCallback) {
    var newEvent = {
        startTime: startTime,
        endTime: endTime,
        datasetId: datasetId,
        type: 'Wave',
        source: {}
    };
    createResource(server, '/event/', newEvent, doneCallback);
};


