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
        name: 'Wave - Failed'
    },
    {
        name: 'Paddle'
    },
    {
        name: 'Stationary'
    },
    {
        name: 'Wipe out'
    },
    {
        name: 'Inverted'
    },
    {
        name: 'Surfer - Laying'
    },
    {
        name: 'Surfer - Sitting'
    },
    {
        name: 'Surfer - Hanging'
    },
    {
        name: 'Surfer - Standing'
    },
    {
        name: 'Surfer - Not on board'
    },
    {
        name: 'Surfer - Pulling'
    },
    {
        name: 'Pop Up'
    },
    {
        name: 'Drop'
    },
    {
        name: 'Paddle Out'
    },
    {
        name: 'Duck Dive'
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
        name: 'Paddle In'
    },
    {
        name: 'Paddle Left'
    },
    {
        name: 'Paddle Right'
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
