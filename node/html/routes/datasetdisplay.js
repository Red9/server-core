var datasetResource = require('./../../support/resources/resource/dataset_resource');
var config = require('./../../config');

// TODO(SRLM): Make this get/calculate the column groups based on the dataset column schema.
function GetDefaultColumnGroups(dataset) {
    var column_groups = [];
    column_groups.push({title: "Speed", id: "speed", columns: "gps:speed"});
    column_groups.push({title: "Accelerometer", id: "accl", columns: "acceleration:x,acceleration:y,acceleration:z"});
    column_groups.push({title: "Gyroscope", id: "gyro", columns: "rotationrate:x,rotationrate:y,rotationrate:z"});
    column_groups.push({title: "Magnetometer", id: "magn", columns: "magneticfield:x,magneticfield:y,magneticfield:z"});
    column_groups.push({title: "Barometer", id: "baro", columns: "pressure:pressure"});
    //column_groups.push({title: "Temperature", id: "temp", columns: "pressure:temperature"});

    return column_groups;
}


exports.get = function(req, res, next) {
    datasetResource.getDatasets({id:req.param('uuid')}, function(dataset) {
        if (dataset.length !== 1) {
            next();
        } else {
            dataset = dataset[0];
            var content = [];
            content['page_title'] = 'Scopes Display';
            content['title'] = 'Scope';
            content['dataset'] = dataset;
            res.render('datasetdisplay', content);
        }

    });

};