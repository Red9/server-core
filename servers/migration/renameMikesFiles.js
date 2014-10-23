var request = require('request');
var _ = require('underscore')._;
var fs = require('fs');
var path = require('path');
var async = require('async');

var rootPath = '/home/clewis/Downloads/migration/';
var mikeDir = path.join(rootPath, 'mikesOriginalRNC');
var outputDir = path.join(rootPath, 'mikesFlattenedRNC');
var notesFilename = path.join(rootPath, 'mikesFlattenedMap.json');


//try {
//    fs.rmdirSync(outputDir);
//} catch (e) {
//}
//fs.mkdirSync(outputDir);

var mapFilenameToIds = {};

var writeMap = {};

function processDir(dirPath, doneCallback) {
    fs.readdir(dirPath, function (err, files) {
        async.eachLimit(files, 4, function (file, callback) {
            var filePath = path.join(dirPath, file);
            fs.stat(filePath, function (err, stat) {
                if (stat.isDirectory()) {
                    processDir(filePath, callback);
                } else if (stat.isFile() && _.has(mapFilenameToIds, file)) {
                    mapFilenameToIds[file].count++;
                    _.each(mapFilenameToIds[file].ids, function (idFilename) {
                        var outputPath = path.join(outputDir, idFilename);
                        console.log('Writing ' + filePath + ' to ' + outputPath);
                        writeMap[outputPath] = filePath;
                        fs.createReadStream(filePath).pipe(fs.createWriteStream(outputPath));
                    });
                    process.nextTick(callback);
                } else {
                    process.nextTick(callback);
                }
            });
        }, doneCallback)
    });
}

request({
    url: 'http://api.redninesensor.com/dataset/?part=id,source',
    json: true
}, function (err, response, datasetList) {

    _.each(datasetList, function (dataset) {
        if (_.isObject(dataset.source)) {
            var filename = dataset.source.filename;
            if (!_.has(mapFilenameToIds, filename)) {
                mapFilenameToIds[filename] = {
                    count: 0,
                    ids: []
                };
            }
            mapFilenameToIds[filename].ids.push(dataset.id + '.RNC');
        }
    });

    processDir(mikeDir, function (err) {
        if (err) {
            console.log(err);
        }

        fs.writeFile(notesFilename, JSON.stringify({
            writeMap: writeMap,
            filenameToIdMap: mapFilenameToIds
        }, null, 4), function (err) {
            if (err) {
                console.log(err);
            }
        });
        //process.exit(0);
    });
});