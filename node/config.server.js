exports.apiPort = 8081;
exports.htmlPort = 8082;

exports.htmlRealm = 'http://redninesensor.com';
exports.apiRealm = 'http://api.redninesensor.com';

exports.tempDirectory = "/tmp/red9_dev_website/";
exports.sessionSecret = 'powells at pdx';

exports.dataProcessingDirectory = '../../data-processing';
exports.usrDirectory = exports.dataProcessingDirectory + '/usr';
exports.statistician_children = exports.dataProcessingDirectory + '/statistics/children';

exports.logfilepath = '../logs/';

exports.release = true;

exports.cassandraHosts = ['localhost:9042'];
exports.cassandraKeyspace = 'dev';