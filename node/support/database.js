
var async = require('async');
var Client = require('node-cassandra-cql').Client;
var log = require('./logger').log;

var hosts = ['localhost:9042'];
var database = new Client({hosts: hosts, keyspace: 'dev'});

var dataset_schema = ['id', 'raw_data', 'name', 'create_time', 'create_user',
    'start_time', 'end_time', 'processing_config', 'processing_notes',
    'processing_statistics', 'summary_statistics', 'number_rows', 'filename',
    'scad_unit', 'column_titles', 'event_tree'];

var event_schema = ['id', 'dataset', 'start_time', 'end_time', 'confidence',
    'parent', 'children', 'type', 'parameters', 'source', 'create_time'];

var user_schema = ['id', 'display_name', 'google_id', 'email', 'first', 'last', 'create_time'];

var schemas = {
    dataset: dataset_schema,
    event: event_schema,
    user: user_schema
};

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

exports.InsertRow = function(tableName, parameters, callback) {
    var schema = schemas[tableName];

    var query = "INSERT INTO " + tableName + " (";
    var query_placeholders = ") VALUES (";
    var first_parameter = true;

    var database_parameters = [];

    for (var i = 0; i < schema.length; i++) {
        var parameter = parameters[schema[i]];
        if (typeof parameter !== "undefined") {
            if (first_parameter === false) {
                query += ",";
                query_placeholders += ",";
            }
            query += schema[i];
            query_placeholders += "?";
            database_parameters.push(parameter);
            first_parameter = false;
        }
    }

    query += query_placeholders + ")";
    log.info("Database command: '" + query + "' with parameters '" + database_parameters + "'");

    database.execute(query, database_parameters, function(err) {
        if (err) {
            log.error("Database InsertRow!" + err);
            callback(err);
        } else {
            callback();
        }
    });
};

//UPDATE users
//  SET top_places = [ 'the shire' ] + top_places WHERE user_id = 'frodo';

exports.UpdateRowAddToList = function(tableName, key, value, column, data, callback) {
    var query = "UPDATE " + tableName + " SET " + column + " = " + column + " + [?] WHERE " + key + " = ?";
    var database_parameters = [data, value];

    log.info("Database command: '" + query + "' with parameters '" + database_parameters + "'");

    database.execute(query, database_parameters, function(err) {
        if (err) {
            log.warn("Update error: " + err);
            callback(err);
        } else {
            callback();
        }
    });
};


/** Get a single row identified by id from the table specified.
 * 
 * @param {string} tableName The CQL name of the table.
 * @param {string} key The cassandra table key
 * @param {string or map} value the value to pass.
 * @param {function} callback(content) If not found content is undefined. Otherwise it's a JSON with tabel schema.
 * @returns {undefined}
 */
exports.GetRow = function(tableName, key, value, callback) {
    var database_command = "SELECT ";
    var schema = schemas[tableName];

    database_command += schema[0];
    for (var i = 1; i < schema.length; i++) {
        database_command += "," + schema[i];
    }

    database_command += " FROM " + tableName + " WHERE " + key + " = ?";

    database.execute(database_command, [value], function(err, result) {
        var content;
        if (err) {
            log.warn("Error from database command '" + database_command + "' with parameter '" + value + "'");
        } else {
            if (result.rows.length !== 1) {
                log.error("Database errror: UUID not unique! Incorrect number of results ("
                        + result.rows.length + ") for query '" + database_command + "' with parameter '" + value + "'");
            } else {
                content = ExtractRowToJSON(schema, result.rows[0]);
            }
        }
        callback(content);
    });
};

exports.GetAllRows = function(tableName, callback) {
    var database_command = "SELECT * FROM " + tableName;
    database.execute(database_command, function(err, result) {

        if (err) {
            log.error("GetAllFromTable error: " + err);
            callback([]);
        } else {
            if (tableName === "dataset") {
                ParseDatasetCollection(result.rows, callback);
            } else {
                var datasets = [];
                //TODO(SRLM): for each row...
                callback(datasets);
            }
        }
    });
};


function ParseDatasetCollection(rows, callback) {
    var datasets = [];
    async.eachLimit(rows, 10, function(row, callback) {
        FormatDatasetInformation(ExtractRowToJSON(schemas["dataset"], row), function(content) {
            datasets.push(content);
            callback();
        });
    }, function(err) {
        if (err) {
            log.warn("Some sort of error on get all dataset.)");
        }
        callback(datasets);
    });
}


function ExtractRowToJSON(schema, row) {
    content = {};
    for (var i = 0; i < schema.length; i++) {
        content[schema[i]] = row.get(schema[i]);
    }
    return content;
}

exports.GetDisplayName = function(id, callback) {
    exports.GetRow("user", "id", id, function(data) {
        if (typeof data === "undefined") {
            callback("[database error]");
        } else {
            callback(data["display_name"]);
        }
    });
};



/**
 * Format a duration in milliseconds to a human readable format, e.g.
 * "4y 2d 3h 10m 10s 255ms". Negative durations are formatted like "- 8h 30s".
 * Granularity is always ms.
 * 
 * Source: https://gist.github.com/betamos/6306412
 * 
 *
 * @param t Duration in milliseconds
 * @return A formatted string containing the duration or "" if t=0
 */
var readableDuration = (function() {

    // Each unit is an object with a suffix s and divisor d
    var units = [
        {s: 'ms', d: 1},
        {s: 's', d: 1000},
        {s: 'm', d: 60},
        {s: 'h', d: 60},
        {s: 'd', d: 24},
        {s: 'y', d: 365} // final unit
    ];

    // Closure function
    return function(t) {
        t = parseInt(t); // In order to use modulus
        var trunc, n = Math.abs(t), i, out = []; // out: list of strings to concat
        for (i = 0; i < units.length; i++) {
            n = Math.floor(n / units[i].d); // Total number of this unit
            // Truncate e.g. 26h to 2h using modulus with next unit divisor
            trunc = (i + 1 < units.length) ? n % units[i + 1].d : n; // …if not final unit
            trunc ? out.unshift('' + trunc + units[i].s) : null; // Output if non-zero
        }
        (t < 0) ? out.unshift('-') : null; // Handle negative durations
        return out.join(' ');
    };
})();


/**
 * 
 * @param {type} content The dataset to get the user from.
 * @param {type} callback function(dataset_content)
 * will:
 *  1. Format the dates and times as UTC string
 *  2. Replace submit_user with submit_user:{id:"",display_name:""}
 *  3. Add field "duration" (difference in time between start and end, formatted in HH:MM:SS.SSSS
 *  
 * 
 * @returns {undefined}
 */
function FormatDatasetInformation(content, callback) {
    if (typeof content !== "undefined") {
        content['create_time'] = (new Date(content['create_time'])).toUTCString();
        var start_time = (new Date(content['start_time']));
        var end_time = (new Date(content['end_time']));
        content['start_time'] = start_time.toUTCString();
        content['end_time'] = end_time.toUTCString();
        content['duration'] = readableDuration((end_time.getTime() - start_time.getTime()) / 1000);

        exports.GetDisplayName(content['create_user'], function(display_name) {
            content['create_user'] = {id: content['create_user'],
                display_name: display_name
            };
            callback(content);
        });
    } else {
        callback(content);
    }
}

/** 
 * @param {type} dataset_uuid
 * @param {type} callback(dataset_json)
 same as GetDataset, but formats the username and dates.
 * 
 */
exports.GetDatasetFormatted = function(id, callback) {
    exports.GetRow("dataset", "id", id, function(content) {
        FormatDatasetInformation(content, callback);
    });
};

/**
 * 
 * @param {string} dataset_uuid
 * @param {function} callback parameter of true if sucessfully deleted, false otherwise.
 * @returns {undefined}
 */
exports.DeleteDataset = function(dataset_uuid, callback) {
    exports.GetRow("dataset", "id", dataset_uuid, function(content) {

        if (typeof content === "undefined") {
            callback(false);
        } else {
            var raw_data_uuid = content["raw_data"];

            database.execute("DELETE FROM dataset WHERE id=?", [dataset_uuid], function(err1) {
                database.execute("DELETE FROM raw_data WHERE id=?", [raw_data_uuid], function(err2) {
                    if (err1 || err2) {
                        log.error("Error deleting dataset: ", err1, err2);
                    }
                    callback(true);
                });
            });

        }
    });
};



exports.StripHintsFromJSON = function(set) {
    var result = {};
    for (var key in set) {
        var value = set[key];
        if (typeof set[key].value !== "undefined") {
            value = set[key].value;
        }
        result[key] = value;
    }
    return result;
};