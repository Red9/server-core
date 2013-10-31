var database = require('./../support/database');


// TODO(SRLM): Make this get/calculate the column groups based on the dataset column schema.
function GetDefaultColumnGroups() {
    var column_groups = [];
    column_groups.push({title: "Speed", id: "speed", columns: "speed"});
    column_groups.push({title: "Accelerometer", id: "accl", columns: "accl_x,accl_y,accl_z"});
    column_groups.push({title: "Gyroscope", id: "gyro", columns: "gyro_x,gyro_y,gyro_z"});
    column_groups.push({title: "Magnetometer", id: "magn", columns: "magn_x,magn_y,magn_z"});
    column_groups.push({title: "Barometer", id: "baro", columns: "baro"});
    column_groups.push({title: "Temperature", id: "temp", columns: "temp"});

    return column_groups;
}


exports.get = function(req, res, next){
    database.GetRow("event", "id", req.params.uuid, function(event){
        if(typeof event === "undefined"){
            next();
        }else{
            var content = [];
            content["title"] = "Event";
            content["event"] = event;
            content["column_group"] = GetDefaultColumnGroups();
            
            res.render("eventdisplay", content);
            
        }
    });
    
};


