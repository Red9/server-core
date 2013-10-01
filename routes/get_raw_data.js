/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


var fs = require('fs');
var lazy = require('lazy');

var database = require('./../support/database').database;

var column_base = 0;
var column_names = {};
column_names["accl_x"] = column_base + 0;
column_names["accl_y"] = column_base + 1;
column_names["accl_z"] = column_base + 2;
column_names["gyro_x"] = column_base + 3;
column_names["gyro_y"] = column_base + 4;
column_names["gyro_z"] = column_base + 5;
column_names["magn_x"] = column_base + 6;
column_names["magn_y"] = column_base + 7;
column_names["magn_z"] = column_base + 8;
column_names["baro"] = column_base + 9;
column_names["temp"] = column_base + 10;



function OutputNormal(res, result, output_column_indexes) {
    for (var i = 0; i < result.rows.length; i++) {
        var time = result.rows[i].get('time');
        res.write(Date.parse(time).toString());

        if (output_column_indexes.length > 0) { //Output specific columns
            for (var j = 0; j < output_column_indexes.length; j++) {
                res.write("," + result.rows[i].get('data')[output_column_indexes[j]]);
            }
        } else { // Output all columns
            for (var j = 0; j < result.rows[i].get('data').length; j++) {
                res.write("," + result.rows[i].get('data')[j]);
            }
        }
        res.write('\n');
    }
}


function CalculateBucketSummary(bucket_list, output_column_indexes) {

    var minimum = [];
    var sum = [];
    var average = [];
    var maximum = [];

    for (var i = 0; i < output_column_indexes.length; i++) {
        minimum.push(Number.MAX_VALUE);
        sum.push(0);
        maximum.push(-(Number.MAX_VALUE - 1));
    }

    var time;

    if (bucket_list.length === 0) {
        console.log("Bucket length === 0!!!!!");
    } else {
        time = (new Date(bucket_list[Math.floor(bucket_list.length / 2)].get('time'))).getTime();

        for (var i = 0; i < bucket_list.length; i++) {
            var row = bucket_list[i].get('data');

            for (var j = 0; j < output_column_indexes.length; j++) {

                var value = row[output_column_indexes[j]];
                sum[j] += value;
                minimum[j] = Math.min(minimum[j], value);
                maximum[j] = Math.max(maximum[j], value);
            }
        }
    }


    var result = [];
    for (var i = 0; i < sum.length; i++) {
        var column = [];
        column.push(minimum[i]);
        column.push(sum[i] / bucket_list.length);
        column.push(maximum[i]);
        result.push(column);
    }





    return {time: time,
        data: result
    };


}

function OutputSummary(res, summary) {
    if (typeof summary.time !== "undefined") {
        res.write(summary.time.toString());
        
        var data = summary.data;
        
        for (var i = 0; i < data.length; i++) {
            var column = data[i];
            res.write("," + column[0] + ";" + column[1] + ";" + column[2]);
        }
        res.write("\n");
    }
}



function OutputBuckets(res, result, output_column_indexes, start_time, end_time, buckets) {
    //TODO(SRLM): Add test to make sure that start_time and end_time are in the correct order.
    //TODO(SRLM): Add test to make sure that start_time and end_time are not way out of bounds (too early or too late).
    if (typeof start_time === "undefined") {
        start_time = new Date(result.rows[0].get('time'));
    }

    if (typeof end_time === "undefined") {
        end_time = new Date(result.rows[result.rows.length - 1].get('time'));
    }
    

    var time_per_bucket = (end_time.getTime() - start_time.getTime()) / buckets;
    

    var bucket = [];

    var bucket_start_time = start_time.getTime();

    for (var row_i = 0; row_i < result.rows.length; row_i++) {
        var row_time = (new Date(result.rows[row_i].get('time'))).getTime();

        if (row_time >= bucket_start_time) {
            if (row_time > bucket_start_time + time_per_bucket) {
                OutputSummary(res, CalculateBucketSummary(bucket, output_column_indexes));

                bucket_start_time += time_per_bucket;
                bucket = [];
                bucket.push(result.rows[row_i]);
            } else {
                bucket.push(result.rows[row_i]);
            }
        }

    }

    if (bucket.length !== 0) { //Clean up last info if there.
        OutputSummary(res, CalculateBucketSummary(bucket, output_column_indexes));
    }


}
;

exports.get = function(req, res) {
    /*console.log("Requested data for UUID ", req.params.uuid);

    console.log("req.param('startTime'): ", req.param('startTime'));
    console.log("req.param('endTime'): ", req.param('endTime'));
    console.log("req.param('buckets'): ", req.param('buckets'));
    console.log("req.param('columns'): ", req.param('columns'));*/


    var startTime = "undefined";
    var endTime = "undefined";
//    var numIntervals = Number.MAX_VALUE;

    var output_column_indexes = [];
    var column_labels = [];



    var query = 'SELECT time, data FROM raw_data WHERE id=?';
    var parameters = [req.params.uuid];

    var start_time, end_time;

    if (typeof req.param('startTime') !== "undefined") {
        start_time = new Date(parseFloat(req.param('startTime')));
        query += ' AND time >= ?';
        parameters.push(start_time.getTime());
    }

    if (typeof req.param('endTime') !== "undefined") {
        end_time = new Date(parseFloat(req.param('endTime')));
        query += ' AND time <= ?';
        parameters.push(end_time.getTime());
    }


    var buckets = -1;
    if (typeof req.param('buckets') !== "undefined") {
        buckets = parseInt(req.param('buckets'));
    }


    if (typeof req.param('columns') !== "undefined") {
        var raw_columns = req.param('columns').split(",");

        for (var i = 0; i < raw_columns.length; i++) {
            var number = parseInt(raw_columns[i]);
            if (isNaN(number) === false) {
                output_column_indexes.push(number);
                column_labels.push("Col_" + number.toString());
            } else {
                if (raw_columns[i] in column_names) {
                    output_column_indexes.push(column_names[raw_columns[i]]);
                    column_labels.push(raw_columns[i]);
                } else {
                    console.log("No column name that matches '" + raw_columns[i] + "'");
                }


            }
        }

    } else {
        column_labels = Object.keys(column_names);
    }

    //TODO(SRLM): Check to make sure that UUID is actually a UUID!!!!



    database.execute(query, parameters,
            function(err, result) {
                if (err) {
                    console.log(err);
                } else {

                    res.write("time");
                    for (var i = 0; i < column_labels.length; i++) {
                        res.write("," + column_labels[i]);
                    }
                    res.write('\n');

                    if (result.rows.length !== 0) {

                        if (buckets <= 0) {
                            OutputNormal(res, result, output_column_indexes);
                        } else { //Cut up into buckets
                            OutputBuckets(res, result, output_column_indexes, start_time, end_time, buckets);
                        }
                    }

                }
                res.end();
            });

};

