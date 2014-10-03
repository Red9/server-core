//exports = require('./config.local');
exports.ports = {
    api: [
        8082,
        8083,
        8084,
        8085
    ],
    html: [
        8081
    ],
    action: [
        8086
    ]
};

exports.realms = {
    html: 'http://localdev.redninesensor.com',
    api: 'http://api.localdev.redninesensor.com',
    action: 'http://action.localdev.redninesensor.com'
};

exports.tempDirectory = "/tmp/red9_dev_website/";
exports.sessionSecret = 'powells at pdx';

exports.dataProcessingDirectory = '../../data-processing';
exports.statistician_children = exports.dataProcessingDirectory + '/statistics/children';

exports.logFileDirectory = '/home/clewis/consulting/red9/dev-website/logs';

exports.release = false;

exports.cassandraHosts = ['localhost:9042'];
exports.cassandraKeyspace = 'dev';

exports.requireRoot = '/home/clewis/consulting/red9/dev-website/node';

exports.rncDirectory = '/home/clewis/consulting/red9/dev-website/upload/rnc';

exports.offline = false;

exports.cookieDomain = '.localdev.redninesensor.com';

exports.clientDirectory = '/home/clewis/consulting/red9/dev-website-client';



// -----------------------------------------------------------------------------
// "Global" config

exports.pageTemplateDefaults = {
    site: {
        title: 'Total State',
        description: 'Motion analytics software'
    },
    author: {
        displayName: 'srlm',
        email: 'srlm@redninesensor.com'
    }
};

exports.nodetimeProfile = {
    accountKey: 'b0bde370aeb47c1330dbded1c830a5d93be1e5e2',
    appName: 'Dev Website'
};

exports.defaultTimezone = 'America/Los_Angeles';

exports.sessionMaxAge = 3 * 24 * 60 * 60 * 1000; // Three days

exports.logglyparameters = {
    subdomain: 'redninesensor',
    inputToken: '517e6f6c-a1fa-454a-a3bc-e8b6659ee8c4'
};

exports.papertrailparameters = {
    host: 'logs.papertrailapp.com',
    port: 19395,
    colorize: true
};


exports.corsOrigins = [
    'http://surfing22.com',
    'null' // Null origin comes from developing with a 'file://' url, aka, self hosted HTML page.
];

/*var underscore = require('underscore')._;

var requiredInstanceKeys = [
    'ports',
    'realms',
    'tempDirectory',
    'sessionSecret',
    'statistician_children',
    'release',
    'cassandraHosts',
    'cassandraKeyspace',
    'rncDirectory',
    'logFileDirectory',
    'offline',
    'cookieDomain',
    'clientDirectory'
];

exports.ProcessCommandLine = function() {
    // Process command line arguments
    var stdio = require('stdio');
    var ops = stdio.getopt({
        config: {key: 'config', args: 1, description: 'Specify the configuration file'},
        type: {key: 'type', args: 1, description: 'Specify the server type (html, api)'}
    });

    if (typeof ops.config === 'undefined') {
        console.log('ERROR: must specify a configuration file.');
        process.exit(1);
    }
    if (typeof ops.type === 'undefined') {
        console.log('ERROR: must specify a server type');
        process.exit(1);
    }

    exports.serverType = ops.type;

    var instanceconfig = require('./' + ops.config);
    underscore.each(requiredInstanceKeys, function(key) {
        if (typeof instanceconfig[key] !== 'undefined') {
            exports[key] = instanceconfig[key];
        } else {
            console.log('ERROR: must include all required instance keys.');
            process.exit(1);
        }
    });

    GLOBAL.requireFromRoot = (function(root) {
        return function(resource) {
            return require(root + "/" + resource);
        };
    })(__dirname);
};

exports.pageTemplateDefaults = {
    site: {
        title: 'Total State',
        description: 'Motion analytics software'
    },
    author: {
        displayName: 'srlm',
        email: 'srlm@redninesensor.com'
    }
};

exports.nodetimeProfile = {
    accountKey: 'b0bde370aeb47c1330dbded1c830a5d93be1e5e2',
    appName: 'Dev Website'
};

exports.defaultTimezone = 'America/Los_Angeles';

exports.sessionMaxAge = 3 * 24 * 60 * 60 * 1000; // Three days

exports.logglyparameters = {
    subdomain: 'redninesensor',
    inputToken: '517e6f6c-a1fa-454a-a3bc-e8b6659ee8c4'
};

exports.papertrailparameters = {
    host: 'logs.papertrailapp.com',
    port: 19395,
    colorize: true
};


exports.corsOrigins = [
    'http://surfing22.com',
    'null' // Null origin comes from developing with a 'file://' url, aka, self hosted HTML page.
];*/