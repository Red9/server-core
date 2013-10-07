

var Client = require('node-cassandra-cql').Client;
var hosts = ['localhost:9042'];
var database = new Client({hosts: hosts, keyspace: 'dev'});

var dataset_schema = ['id', 'data', 'name', 'submit_date', 'submit_user',
    'start_time', 'end_time', 'processing_config', 'processing_notes',
    'processing_statistics', 'metadata', 'video', 'event_type', 'description',
    'number_rows', 'filename', 'release_level', 'scad_unit', 'column_titles', 'fuel'];


var raw_data_column_titles = [
    'accl_x', 'accl_y', 'accl_z',
    'gyro_x', 'gyro_y', 'gyro_z',
    'magn_x', 'magn_y', 'magn_z',
    'baro', 'temp',
    'lat', 'long', 'alt', 'speed', 'hdop',
    'quat_w', 'quat_x', 'quat_y', 'quat_z'
];

var log = require('./logger').log;

/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
exports.GenerateUUID = function() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return (_p8() + _p8(true) + _p8(true) + _p8());
};


exports.getDefaultRawDataColumnTitles = function() {
    return raw_data_column_titles;
};

exports.GetDisplayName = function(uuid, callback) {
    database.execute("SELECT display_name FROM users WHERE id=?", [uuid], function(err, response) {
        var result = "";
        if (err) {
            log.error("Database Error: GetDisplayName: ", err);
            result = "[database error]";
        } else {
            if (response.rows.length !== 1) {
                log.error("Database Error: GetDisplayName: Incorrect number of rows on user " + uuid + " request!");
                result = "[wrong row count]";
            } else {
                var display_name = response.rows[0].get("display_name");
                result = display_name;
            }
        }
        callback(result);
    });
};


exports.InsertUser = function(user_parameters, callback) {

    var query = "INSERT INTO users (id,display_name,google_id,email,first,last) VALUES (?,?,?,?,?,?)";
    var parameters = [
        user_parameters.id,
        user_parameters.display_name,
        user_parameters.google_id,
        user_parameters.email,
        user_parameters.first,
        user_parameters.last
    ];

    for (var i = 0; i < parameters.length; i++) {
        log.info("Parameters[" + i + "] === " + parameters[i]);
    }

    database.execute(query, parameters, function(err) {
        if (err) {
            log.error("Database: InsertUser: ", err);
        } else {
            callback();
        }
    });

};

exports.GetUserByEmail = function(email, callback) {
    // Note that google_id depends on the domain, so for now we won't use it to authenticate.
    //var query = "SELECT id,display_name FROM users WHERE email=? AND google_id=? ALLOW FILTERING";
    //var parameters = [user.emails[0].value, id];

    var query = "SELECT id,display_name,google_id,email,first,last FROM users WHERE email=? ALLOW FILTERING";
    var parameters = [email];

    database.execute(query, parameters, function(err, result) {
        var user;
        if (result.rows.length === 0) {

        } else if (result.rows.length > 1) {
            log.error("Database Error: GetUserByEmail:  too many users found for " + email + " (found " + result.rows.length + ")");
        } else { // === 1
            var row = result.rows[0];
            user = {
                id: row.get('id'),
                display_name: row.get('display_name'),
                google_id: row.get('google_id'),
                email: row.get('email'),
                first: row.get('first'),
                last: row.get('last')
            };
        }
        callback(user);
    });
};


/**
 * 
 * @param {type} dataset_uuid
 * @param {type} callback(content) If not found content is undefined. Otherwise it's a JSON with dataset_schema.
 * @returns {undefined}
 */
exports.GetDataset = function(dataset_uuid, callback) {



    var database_command = "SELECT ";
    database_command += dataset_schema[0];
    for (var i = 1; i < dataset_schema.length; i++) {
        database_command += "," + dataset_schema[i];
    }

    database_command += " FROM dataset WHERE id = ?";

    database.execute(database_command, [dataset_uuid], function(err, result) {
        var content;
        if (err) {
            log.error("Database Error: GetDataset: ", err);
        } else {
            if (result.rows.length !== 1) {
                log.error("Database Error: GetDataset: Incorrect number of results (" + result.rows.length + ") for query! ");
            } else {
                content = {};
                for (var i = 0; i < dataset_schema.length; i++) {
                    content[dataset_schema[i]] = result.rows[0].get(dataset_schema[i]);
                }

            }
        }
        callback(content);
    });
};


/** 
 * @param {type} dataset_uuid
 * @param {type} callback(dataset_json)
 same as GetDataset, but will:
 *  1. Format the dates and times as UTC string
 *  2. Replace submit_user with submit_user:{id:"",display_name:""}
 *  
 * 
 */
exports.GetDatasetFormatted = function(dataset_uuid, callback) {
    exports.GetDataset(dataset_uuid, function(content) {

        if (typeof content !== "undefined") {
            content['submit_date'] = (new Date(content['submit_date'])).toUTCString();
            content['start_time'] = (new Date(content['start_time'])).toUTCString();
            content['end_time'] = (new Date(content['end_time'])).toUTCString();

            exports.GetDisplayName(content['submit_user'], function(display_name) {
                content['submit_user'] = {id: content['submit_user'],
                    display_name: display_name
                };
                callback(content);
            });
        } else {
            callback(content);
        }
    });
};


exports.database = database;
exports.dataset_schema = dataset_schema;


