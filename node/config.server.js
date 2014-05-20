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
    html: 'http://redninesensor.com',
    api: 'http://api.redninesensor.com',
    action: 'http://action.redninesensor.com'
};

exports.tempDirectory = "/tmp/red9_dev_website/";
exports.sessionSecret = 'powells at pdx';

exports.dataProcessingDirectory = '../../data-processing';
exports.usrDirectory = exports.dataProcessingDirectory + '/usr';
exports.statistician_children = exports.dataProcessingDirectory + '/statistics/children';

exports.logfilepath = '/home/ubuntu/dev-website/logs';

exports.release = true;

exports.cassandraHosts = ['localhost:9042'];
exports.cassandraKeyspace = 'dev';

exports.requireRoot = '/home/ubuntu/dev-website/node';

exports.rncDirectory = '/home/ubuntu/upload/rnc';
