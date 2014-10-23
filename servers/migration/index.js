var request = require('request');
var _ = require('underscore')._;
var fs = require('fs');

var url = 'http://api.redninesensor.com/dataset/';

var panelDir = '/home/clewis/Downloads/serverRNC/';

var resource = require('red9resource');
var panel = require('red9panel').panelReader({
    dataPath: "/home/clewis/Downloads/RNC"
});
var path = require('path');
var async = require('async');

/**
 *
 * @param datasetList
 * @param callback {err, datasetIdMap}
 */
function loadDatasets(datasetList, callback) {
    var oldToNewIdMap = {};

    function loadDataset(oldDataset, callback) {
        console.log('Uploading ' + oldDataset.id);
        var readStream = fs.createReadStream(path.join(panelDir, oldDataset.id + '.RNC'));
        var newDataset = {
            title: oldDataset.title,
            owner: oldDataset.owner
        };

        resource.helpers.createDataset(panel, resource, newDataset, readStream, function (err, createdDataset) {
            if (err) {
                callback(err);
            } else {
                oldToNewIdMap[oldDataset.id] = createdDataset.id;
            }
            callback();
        });
    }

    async.eachLimit(datasetList, 6, loadDataset, function (err) {
        callback(err, oldToNewIdMap);
    });
}

function getUploadableDatasets(callback) {
    var uploadableDatasets = [];

    // Get a list of datasetIds that have panels
    var panelList = _.map(fs.readdirSync(panelDir), function (filename) {
        return filename.split('.')[0];
    });


    request({
        url: url,
        json: true
    }, function (err, response, datasetList) {
        if (err) {
            console.log('Error: ' + err);
        }

        // Figure out which datasets from the database have a local RNC panel
        _.chain(datasetList).sortBy(function (dataset) {
            return -dataset.createTime;
        }).each(function (dataset, index) {
            var outputLine = index + ': ' + dataset.id;
            if (panelList.indexOf(dataset.id) !== -1) {
                outputLine += ' +++ ';
                uploadableDatasets.push(dataset);
            } else {
                outputLine += '     '
            }
            outputLine += dataset.title;
            console.log(outputLine);

        });

        callback(null, uploadableDatasets);
    });
}



resource.init({
    cassandraHosts: ["localhost"],
    cassandraKeyspace: "development"
}, function (err) {
    if (err) {
        console.log(err);
    }

    getUploadableDatasets(function (err, uploadableDatasets) {
        loadDatasets(uploadableDatasets, function (err, datasetIdMap) {
            // TODO: Get events, adjust times, etc.
        });
    });
});


