/* 
 * TODO(SRLM): Make this handle requests for files that aren't actually there (instead of crashing).
 *  
 *    */

var lazy = require('lazy');
var fs = require('fs');



CalculatePoint = function(intervalData, column) {

    if (intervalData.length == 1) {
        //res.write(intervalData[0][0].toString() + "," +
        //	intervalData[0][1].toString() + ";" +
        //	intervalData[0][1].toString() + ";" +
        //	 intervalData[0][1].toString() + "\n");
        return {
            time: intervalData[0][0].toString(),
            minimum: intervalData[0][column].toString(),
            average: intervalData[0][column].toString(),
            maximum: intervalData[0][column].toString()
        };


    } else if (intervalData.length > 1) {
        var sum = 0;
        var minimum = Number.MAX_VALUE;
        var maximum = -(Number.MAX_VALUE - 1);

        for (var i = 0; i < intervalData.length; i++) {
            sum += intervalData[i][column];

            minimum = Math.min(minimum, intervalData[i][column]);
            maximum = Math.max(maximum, intervalData[i][column]);

            //console.log(i.toString + ":" + intervalData[0][0].toString() + "," + intervalData[i][1].toString() + ";"
            //+ minimum.toString() + ";" + (sum/intervalData.length).toString() + ";" + maximum.toString());
        }

        return {
            time: intervalData[0][0].toString(),
            minimum: minimum.toString(),
            average: (sum / intervalData.length).toString(),
            maximum: maximum.toString()
        };

        //res.write(intervalData[0][0].toString() + ","
        //	+ minimum.toString() + ";" + (sum/intervalData.length).toString() + ";" + maximum.toString() + "\n");

    } else { //intervalData.length == 0
        return null;
    }

};

exports.get = function(req, res) {
    console.log("req.param('startTime'): ", req.param('startTime'));
    console.log("req.param('endTime'): ", req.param('endTime'));
    console.log("req.param('pixelWidth'): ", req.param('pixelWidth'));

    var source_filename = "/tmp/rnb2rnt/" + req.params.filename + "-panel.txt";

    var output_columns = [];

    if (req.params.element === "accl") {
        output_columns = [2, 3, 4];
    } else if (req.params.element === "gyro") {
        output_columns = [5, 6, 7];
    } else if (req.params.element === "magn") {
        output_columns = [8, 9, 10];
    } else if (req.params.element === "baro") {
        output_columns = [11];
    } else if (req.params.element === "temp") {
        output_columns = [12];
    }

    /*
     destination_filename += ".txt";
     
     var cut_parameters = " -d',' -f1," + columns + " " + source_filename + " >> " + destination_filename;
     var cut_command = "cut" + cut_parameters;
     
     console.log("cut_command: " + cut_command);
     
     
     
     var child = exec(cut_command, function(err, stdout, stderr){
     fs.readFile(destination_filename, function(cfg_err, data){
     res.write("Hello, world!\n");
     res.write(data);
     res.end();
     });
     //res.sendfile(destination_filename);
     //res.send("Result exec");
     });
     */


    var firstLine = true;

    var startTime = Number.MIN_VALUE;
    var endTime = Number.MAX_VALUE;
    var numIntervals = Number.MAX_VALUE;

    if (typeof req.param('startTime') !== "undefined") {
        startTime = parseFloat(req.param('startTime'));
    }

    if (typeof req.param('endTime') !== "undefined") {
        endTime = parseFloat(req.param('endTime'));
    }

    if (typeof req.param('pixelWidth') !== "undefined") {
        numIntervals = parseFloat(req.param('pixelWidth')) / 2;
    }

    var intervalDuration = (endTime - startTime) / numIntervals;

    var intervalData = [];

    //var intervalStartTime = startTime;
    var intervalEndTime = startTime + intervalDuration;

    var recording = false;

    new lazy(fs.createReadStream(source_filename)).lines.map(String).forEach(function(line) {
        var columns = line.split(",");

        if (firstLine === false) {

            var time = parseFloat(columns[0]);

            if (time > (startTime - intervalDuration) && time <= endTime) {
                recording = true;
            } else {
                recording = false;
                return;
            }

            if (time > intervalEndTime) {
                //CalculateOutput...


                for (var i = 1; i <= 3; i++) {
                    result = CalculatePoint(intervalData, i);
                    if (result !== null) {
                        if (i === 1) {
                            res.write(result.time);
                        }
                        res.write("," + result.minimum + ";" + result.average + ";" + result.maximum);
                    }
                }
                res.write("\n");
                intervalEndTime += intervalDuration;
                intervalData = [];
            }

            intervalData.push([time, parseFloat(columns[1]), parseFloat(columns[2]), parseFloat(columns[3])]);


        } else {
            firstLine = false;
            res.write(columns[0]);

            res.write(",");
            res.write("x");
            res.write(",");
            res.write("y");
            res.write(",");
            res.write("z");

            /*for(var i = 0; i < output_columns.length; i++){
             res.write(",");
             res.write(columns[output_columns[i]]);
             }*/
            res.write("\n");
        }



    }).join(function() {
        //TODO(SRLM): if recording == true there's still data to send!
        // All done reading lines
        res.end();
    });
};