exports.ports = {
    api:[
        8082,
    8083,
    8084,
    8085
    ],
    html:[
        8081
    ]
};

exports.realms = {
    html: 'http://localdev.redninesensor.com',
    api: 'http://api.localdev.redninesensor.com'
};

exports.tempDirectory = "/tmp/red9_dev_website/";
exports.sessionSecret = 'powells at pdx';

exports.dataProcessingDirectory = '../../data-processing';
exports.usrDirectory = exports.dataProcessingDirectory + '/usr';
exports.statistician_children = exports.dataProcessingDirectory + '/statistics/children';

exports.logfilepath = '../logs/';

exports.release = false;

exports.cassandraHosts = ['localhost:9042'];
exports.cassandraKeyspace = 'dev';

exports.requireRoot = '/home/clewis/consulting/red9/dev-website/node';