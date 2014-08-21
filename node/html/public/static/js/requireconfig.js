requirejs.config({
    noGlobal: true,
    baseUrl: "/js",
    paths: {
        customHandlebarsHelpers: 'utilities/customHandlebarsHelpers',
        socketio: (function() {
            // Make sure that we request the socket.io script from the correct
            // server.
            return 'http://action.'
                    + window.location.hostname
                    + '/socket.io/socket.io';
        }())
    },
    shim: {
        'jQuery.validate': [
            'vendor/jquery'
        ],
        customHandlebarsHelpers: [
            'vendor/handlebars'
        ]
    }
});