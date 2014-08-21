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