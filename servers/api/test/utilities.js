"use strict";

var nconf = require('nconf');
var fs = require('fs');
var path = require('path');

var FormData = require('form-data');
var streamToPromise = require('stream-to-promise');

var rncName = 'data_a.RNC';


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
            headers: form.getHeaders()
        }, function (response) {
            server.inject({
                method: 'GET',
                url: '/dataset/' + response.result.id
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
        payload: newResource
    }, function (response) {
        server.inject({
            method: 'GET',
            url: resourceURL + response.result.id
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


