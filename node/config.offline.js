var homeDir = '/home/ubuntu';

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
    html: 'http://offline.redninesensor.com',
    api: 'http://api.offline.redninesensor.com',
    action: 'http://action.offline.redninesensor.com'
};

exports.tempDirectory = "/tmp/red9_dev_website/";
exports.sessionSecret = 'offline secret';

exports.dataProcessingDirectory = homeDir + '/data-processing';
exports.statistician_children = exports.dataProcessingDirectory + '/statistics/children';

exports.logFileDirectory = homeDir + '/dev-website/logs';

exports.release = false;

exports.cassandraHosts = ['localhost:9042'];
exports.cassandraKeyspace = 'dev';

exports.requireRoot = homeDir + '/dev-website/node';

exports.rncDirectory = homeDir + '/upload/rnc';

exports.offline = true;

exports.cookieDomain = '.offline.redninesensor.com';

exports.clientDirectory = homeDir + '/dev-website-client';