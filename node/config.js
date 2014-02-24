var underscore = require('underscore')._;

var requiredInstanceKeys = [
    'apiPort',
    'htmlPort',
    'apiRealm',
    'htmlRealm',
    'tempDirectory',
    'sessionSecret',
    'usrDirectory',
    'statistician_children',
    'release',
    'cassandraHosts',
    'cassandraKeyspace'

];

exports.ProcessCommandLine = function() {
    // Process command line arguments
    var stdio = require('stdio');
    var ops = stdio.getopt({
        config: {key: 'config', args: 1, description: 'Specify the configuration file'}
    });
    
    if(typeof ops.config === 'undefined'){
        console.log('ERROR: must specify a configuration file.');
        process.exit(1);
    }

    var instanceconfig = require('./' + ops.config);
    underscore.each(requiredInstanceKeys, function(key) {
        if (typeof instanceconfig[key] !== 'undefined') {
            exports[key] = instanceconfig[key];
        } else {
            console.log('ERROR: must include all required instance keys.');
            process.exit(1);
        }
    });
};

exports.pageTemplateDefaults = {
    site: {
        title: 'Total State',
        description: 'Motion analytics software'
    },
    author: {
        displayName: 'srlm',
        email: 'srlm@srlmproductions.com'
    }
};

exports.nodetimeProfile = {
    accountKey: 'b0bde370aeb47c1330dbded1c830a5d93be1e5e2',
    appName: 'Dev Website'
};

exports.defaultTimezone = '';
exports.panelRowCountLimit = 1000000;

exports.logglyparameters = {
    subdomain: 'redninesensor',
    inputToken: '517e6f6c-a1fa-454a-a3bc-e8b6659ee8c4'
};

exports.papertrailparameters = {
    host: 'logs.papertrailapp.com',
    port: 19395,
    colorize: true
};

exports.unitsMap = {
    "m": {
        si: {
            label: "m",
            multiplier: 1.0
        },
        imperial: {
            label: "ft",
            multiplier: 3.2808
        },
        common: {
            label: "ft",
            multiplier: 3.2808
        }
    },
    "m/s": {
        si: {
            label: "m/s",
            multiplier: 1.0
        },
        imperial: {
            label: "ft/s",
            multiplier: 3.2808
        },
        common: {
            label: "mph",
            multiplier: 2.23694
        }
    },
    "m/s^2": {
        si: {
            label: "m/s^2",
            multiplier: 1.0
        },
        imperial: {
            label: "ft/s^2",
            multiplier: 3.2808
        },
        common: {
            label: "g",
            multiplier: 0.10197
        }
    },
    "rad": {
        si: {
            label: "rad",
            multiplier: 1.0
        },
        imperial: {
            label: "°",
            multiplier: 57.2957795
        },
        common: {
            label: "°",
            multiplier: 57.2957795
        }
    },
    "rad/s": {
        si: {
            label: "rad/s",
            multiplier: 1.0
        },
        imperial: {
            label: "°/s",
            multiplier: 57.2957795
        },
        common: {
            label: "°/s",
            multiplier: 57.2957795
        }
    },
    "T": {
        si: {
            label: "T",
            multiplier: 1.0
        },
        imperial: {
            label: "G",
            multiplier: 10000
        },
        common: {
            label: "G",
            multiplier: 10000
        }
    },
    "Pa": {
        si: {
            label: "Pa",
            multiplier: 1.0
        },
        imperial: {
            label: "psi",
            multiplier: 0.000145037738
        },
        common: {
            label: "psi",
            multiplier: 0.000145037738
        }
    },
    "C": {
        si: {
            label: "C",
            multiplier: 1.0
        },
        imperial: {
            label: "F",
            multiplier: 1.8,
            offset: 32
        },
        common: {
            label: "F",
            multiplier: 1.8,
            offset: 32
        }

    }
};
