'use strict';

var eventTypes = [
    {
        name: 'Default'
    },
    {
        name: 'Wave',
        subtype: [
            {name: 'Left'},
            {name: 'Right'}
        ]
    },
    {
        name: 'Drop In'
    },
    {
        name: 'Bottom Turn'
    },
    {
      name: 'Top Turn'
    },
    {
        name: 'Snap',
        subtype: [
            {name: 'Closeout'}
        ]
    },
    {
        name: 'Turn'
    },
    {
        name: 'Air Drop'
    },
    {
        name: 'Cutback'
    },
    {
        name: 'Floater'
    },
    {
        name: 'Carve'
    },
    {
        name: 'Tail Slide'
    },
    {
        name: 'Pump'
    },
    {
        name: '360'
    },
    {
        name: 'Reverse'
    },
    {
        name: 'Air'
    },
    {
        name: 'Paddle for Wave'
    },
    {
        name: 'Paddle Out'
    },
    {
        name: 'Paddle In'
    },
    {
        name: 'Paddle Left'
    },
    {
        name: 'Paddle Right'
    },
    {
        name: 'Paddle'
    },
    {
        name: 'Duck Dive'
    },
    {
        name: 'Wipe out'
    },
    {
        name: 'Pearling'
    },
    {
        name: 'Session'
    },
    {
        name: 'Walk'
    },
    {
        name: 'Run'
    },
    {
        name: 'Stationary'
    },
    {
        name: 'Dolphin'
    },
    {
        name: 'Tap'
    },
    {
        name: 'Swimming'
    },
    {
        name: 'Sync',
        subtype: [
            {name: 'In'},
            {name: 'Out'}
        ]
    },
    {
        name: 'Turtle'
    },
    {
        name: 'Tack'
    },
    {
        name: 'Jibe'
    }
];

exports.types = eventTypes;

exports.init = function (server) {
    server.route({
        method: 'GET',
        path: '/eventtype/',
        config: {
            handler: function (request, reply) {
                reply(eventTypes);
            },
            description: 'Get predefined event types',
            notes: 'A list of predefined event types. This route is not stable',
            tags: ['api'],
            auth: {
                scope: 'basic'
            }
        }
    });
};
