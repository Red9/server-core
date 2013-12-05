var database = require('./../support/database');


// TODO(SRLM): Make this get/calculate the column groups based on the dataset column schema.
function GetDefaultColumnGroups(dataset) {
    var column_groups = [];
    column_groups.push({title: "Speed", id: "speed", columns: "gps:speed"});
    column_groups.push({title: "Accelerometer", id: "accl", columns: "acceleration:x,acceleration:y,acceleration:z"});
    column_groups.push({title: "Gyroscope", id: "gyro", columns: "rotationrate:x,rotationrate:y,rotationrate:z"});
    column_groups.push({title: "Magnetometer", id: "magn", columns: "magneticfield:x,magneticfield:y,magneticfield:z"});
    column_groups.push({title: "Barometer", id: "baro", columns: "pressure:pressure"});
    column_groups.push({title: "Temperature", id: "temp", columns: "pressure:temperature"});

    return column_groups;
}


exports.get = function(req, res, next){
    database.GetRow("event", "id", req.params.uuid, function(event){
        if(typeof event === "undefined"){
            next();
        }else{
            var content = [];
            content["page_title"] = event["type"];
            content["title"] = "Event";
            content["event"] = event;
            content["column_group"] = GetDefaultColumnGroups();
            
            res.render("eventdisplay", content);
            
        }
    });
    
};


