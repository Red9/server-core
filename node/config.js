exports.tempDirectory = "/tmp/red9_dev_website/";

exports.rnb2rntPath = "bin/rnb2rnt.jar";
exports.downsamplerPath = "bin/downsampler.jar";

exports.sessionSecret = 'powells at pdx';

exports.defaultPort = 8080;

exports.pageTemplateDefaults = {
    site: {
        title: 'Total State',
        description: 'Motion analytics software'
    },
    author: {
        display_name: 'srlm',
        email: 'srlm@srlmproductions.com'
    }
};

exports.nodetimeProfile = {
    accountKey: 'b0bde370aeb47c1330dbded1c830a5d93be1e5e2',
    appName: 'Dev Website'
};

exports.defaultRealm = "http://192.168.1.200:8080";


exports.statistician_children = '../../data-processing/statistics/children';
//exports.statistician_children = '/home/clewis/consulting/red9/data-processing/statistics/children';