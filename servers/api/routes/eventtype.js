"use strict";

var eventTypes = [
    {
        "name": "Default"
    },
    {
        "name": "Wave: Left"
    },
    {
        "name": "Wave: Right"
    },
    {
        "name": "Wave"
    },
    {
        "name": "Drop In"
    },
    {
        "name": "Bottom Turn"
    },
    {
        "name": "Snap"
    },
    {
        "name": "Snap: Closeout"
    },
    {
        "name": "Turn"
    },
    {
        "name": "Air Drop"
    },
    {
        "name": "Cutback"
    },
    {
        "name": "Floater"
    },
    {
        "name": "Carve"
    },
    {
        "name": "Tail Slide"
    },
    {
        "name": "Pump"
    },
    {
        "name": "360"
    },
    {
        "name": "Reverse"
    },
    {
        "name": "Air"
    },
    {
        "name": "Paddle for Wave"
    },
    {
        "name": "Paddle Out"
    },
    {
        "name": "Paddle In"
    },
    {
        "name": "Paddle Left"
    },
    {
        "name": "Paddle Right"
    },
    {
        "name": "Paddle"
    },
    {
        "name": "Duck Dive"
    },
    {
        "name": "Wipe out"
    },
    {
        "name": "Pearling"
    },
    {
        "name": "Session"
    },
    {
        "name": "Walk"
    },
    {
        "name": "Run"
    },
    {
        "name": "Stationary"
    },
    {
        "name": "Dolphin"
    },
    {
        "name": "Tap"
    },
    {
        "name": "Swimming"
    },
    {
        "name": "Sync"
    },
    {
        "name": "Sync: In"
    },
    {
        "name": "Sync: Out"
    }
];

exports.init = function (server) {
    server.route({
        method: 'GET',
        path: '/eventtype/',
        config: {
            handler: function (request, reply) {
                reply(eventTypes);
            },
            description: 'Get predefined event types',
            notes: 'A list of predefined event types. This route is not stable, and will change in the future.',
            tags: ['api']
        }
    });
};
