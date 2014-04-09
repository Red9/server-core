requirejs.config({
    noGlobal: true,
    baseUrl: "/js",
    paths: {
        customHandlebarsHelpers:'utilities/customHandlebarsHelpers'
    },
    shim: {
        'jQuery.validate': [
            'vendor/jquery'
        ],
        customHandlebarsHelpers:[
            'vendor/handlebars'
        ]

    }
});

require(['vendor/jquery', 'vendor/underscore', 'vendor/bootstrap', 'vendor/jquery-ui'], function() {
});