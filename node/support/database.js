
var async = require('async');
var Client = require('node-cassandra-cql').Client;
var log = require('./../support/logger').log;

var hosts = ['localhost:9042'];
var database = new Client({hosts: hosts, keyspace: 'dev'});

var dataset_schema = ['id', 'raw_data', 'name', 'create_time', 'create_user',
    'start_time', 'end_time', 'processing_config', 'processing_notes',
    'processing_statistics', 'summary_statistics', 'number_rows', 'filename',
    'scad_unit', 'column_titles', 'event_tree'];

var event_schema = ['id', 'dataset', 'start_time', 'end_time', 'confidence',
    'parent', 'children', 'type', 'summary_statistics', 'source', 'create_time'];

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

/** Convenience function.
 * 
 * @param {type} query
 * @param {type} parameters
 * @returns {undefined}
 */
function LogCommand(query, parameters) {
    log.info("Database command: '" + query + "' with parameters '" + parameters + "'");
}

function LogError(functionName, error) {
    log.error("Database Error in function " + functionName + ": '" + error + "'");
}

/**
 * 
 * @param {string} tableName
 * @param {map} parameters The values to insert. Should be a map with the keys taken from the table schema.
 * @param {function} callback Returns undefined for success, err for error.
 */
exports.InsertRow = function(tableName, parameters, callback) {
    var schema = schemas[tableName];

    var query = "INSERT INTO " + tableName + " (";
    var queryPlaceholders = ") VALUES (";
    var firstParameter = true;

    var databaseParameters = [];

    for (var i = 0; i < schema.length; i++) {
        var parameter = parameters[schema[i]];
        if (typeof parameter !== "undefined") {
            if (firstParameter === false) {
                query += ",";
                queryPlaceholders += ",";
            } else {
                firstParameter = false;
            }
            query += schema[i];
            queryPlaceholders += "?";
            databaseParameters.push(parameter);
        }
    }

    query += queryPlaceholders + ")";

    LogCommand(query, databaseParameters);

    database.execute(query, databaseParameters, function(err) {
        if (err) {
            LogError("InsertRow", err);
            callback(err);
        } else {
            callback();
        }
    });
};

/**
 * 
 * @param {string} tableName The table to update a row in.
 * @param {string} key The column key to match value to.
 * @param {string} value The column key value to select the row to update.
 * @param {string} listColumnName The column in the matched row with a list to update.
 * @param {type} data The data to modify the list with.
 * @param {string} operation The operation ("add", "remove")
 * @param {function} callback Returns undefined for success, err for error.
 */
exports.UpdateRowModifyList = function(tableName, key, value, listColumnName, data, operation, callback) {
    var operator;
    if (operation === "add") {
        operator = "+";
    } else if (operation === "remove") {
        operator = "-";
    } else {
        // Error,
        var err = "Invalid list operation: " + operation;
        LogError("UpdateRowModifyList", err);
        callback(err);
    }

    var query = "UPDATE " + tableName
            + " SET " + listColumnName + " = " + listColumnName
            + " " + operator + " [?] WHERE " + key + " = ?";
    var database_parameters = [data, value];

    database.execute(query, database_parameters, function(err) {
        if (err) {
            LogError("UpdateRowModifyList", err);
            callback(err);
        } else {
            callback();
        }
    });
};

/** Get a single row identified by id from the table specified.
 * 
 * @param {string} tableName The CQL name of the table.
 * @param {string} key The cassandra row key
 * @param {string or node-cassandra-cql datatype} value the value for that key.
 * @param {function} callback(content) If not found content is undefined. Otherwise it's a JSON with table schema.
 */
exports.GetRow = function(tableName, key, value, callback) {
    var databaseCommand = "SELECT ";
    var schema = schemas[tableName];

    databaseCommand += schema[0];
    for (var i = 1; i < schema.length; i++) {
        databaseCommand += "," + schema[i];
    }

    databaseCommand += " FROM " + tableName + " WHERE " + key + " = ?";

    database.execute(databaseCommand, [value], function(err, result) {
        var content;
        if (err) {
            LogError("GetRow", err);
        } else {
            if (result.rows.length !== 1) {
                LogError("GetRow", "Database errror: UUID not unique! Incorrect number of results ("
                        + result.rows.length + ") for query '" + databaseCommand + "' with parameter '" + value + "'");
            } else {
                content = ExtractRowToJSON(schema, result.rows[0]);
            }
        }
        callback(content);
    });
};


/**
 * 
 * @warning For now, only works with the dataset table.
 * 
 * @param {type} tableName
 * @param {type} callback
 * @returns {undefined}
 */
exports.GetAllRows = function(tableName, callback) {
    var database_command = "SELECT * FROM " + tableName;
    database.execute(database_command, function(err, result) {

        if (err) {
            LogError("GetAllRows", err);
            callback([]);
        } else {
            if (tableName === "dataset") {
                ParseDatasetCollection(result.rows, callback);
            } else if (tableName === "event") {
                callback(ParseEventCollection(result.rows));
            } else {
                //TODO(SRLM): Add options for other tables besides datasets.
                // For now, return empty list.
                var datasets = [];
                callback(datasets);
            }
        }
    });
};


/**
 * 
 * @param {string} tableName The database table to delete from
 * @param {string} key The column of the key
 * @param {string} value The key value
 * @param {function} callback Called when done. Parameter err if error, undefined otherwise.
 */
exports.DeleteRow = function(tableName, key, value, callback) {
    var databaseCommand = "DELETE FROM " + tableName + " WHERE " + key + " = ?";
    database.execute(databaseCommand, [value], function(err) {
        if (err) {
            LogError("DeleteRow", err);
            callback(err);
        } else {
            callback();
        }
    });
};

/**
 * 
 * @param {node-cassandra-cql row} rows The result rows from a query. Should be dataset rows.
 * @param {function} callback parameter of a non-empty list of dataset maps if successful, an empty list otherwise.
 */
function ParseDatasetCollection(rows, callback) {
    var datasets = [];
    async.eachLimit(rows, 10, function(row, callback) {
        FormatDatasetInformation(ExtractRowToJSON(schemas["dataset"], row), function(content) {
            datasets.push(content);
            callback();
        });
    }, function(err) {
        if (err) {
            LogError("ParseDatasetCollection", err);
        }
        callback(datasets);
    });
}

/**
 * 
 * @param {node-cassandra-cql row} rows The result rows from a query. Should be event rows.
 */
function ParseEventCollection(rows) {
    var events = [];
    for (var i = 0; i < rows.length; i++) {
        events.push(ExtractRowToJSON(schemas["event"], rows[i]));
    }
    return events;
}


/**
 * @param {map} schema The schema to extract from the row
 * @param {node-cassandra-cql row} row
 * @returns {map} where key:value pairs whose keys are schema.
 */
function ExtractRowToJSON(schema, row) {
    content = {};
    for (var i = 0; i < schema.length; i++) {
        var value = row.get(schema[i]);
        try {
            value = JSON.parse(value);
        } catch (e) {
            // Do nothing;
        }

        content[schema[i]] = value;
    }
    return content;
}

/** Get the display name associated with a user ID.
 * 
 * @param {string UUID} id The user id
 * @param {function} callback (string) with user ID if successful, empty string if not.
 */
exports.GetDisplayName = function(id, callback) {
    exports.GetRow("user", "id", id, function(data) {
        if (typeof data === "undefined") {
            callback("");
        } else {
            callback(data["display_name"]);
        }
    });
};


/** same as GetDataset, but formats the username and dates in a human readable way.
 * 
 * @param {string uuid} id
 * @param {function} callback (dataset_json)
 * 
 */
exports.GetDatasetFormatted = function(id, callback) {
    exports.GetRow("dataset", "id", id, function(content) {
        FormatDatasetInformation(content, callback);
    });
};

/**
 *  will:
 *  1. Format the dates and times as UTC string
 *  2. Replace submit_user with submit_user:{id:"",display_name:""}
 *  3. Add field "duration" (difference in time between start and end, formatted in HH:MM:SS.SSSS
 *  
 * 
 * @param {map} content The dataset to get the user from.
 * @param {function} callback function(dataset_content)
 */
function FormatDatasetInformation(content, callback) {
    if (typeof content !== "undefined") {
        content['create_time'] = (new Date(content['create_time'])).toUTCString();
        //var start_time = (new Date(content['start_time']));
        //var end_time = (new Date(content['end_time']));
        //content['start_time'] = start_time.toUTCString();
        //content['end_time'] = end_time.toUTCString();

        exports.GetDisplayName(content['create_user'], function(display_name) {
            content['create_user'] = {
                id: content['create_user'],
                display_name: display_name
            };
            callback(content);
        });
    } else {
        callback(content);
    }
}

/**
 * 
 * @param {string} dataset_uuid
 * @param {function} callback parameter of true if sucessfully deleted, false otherwise.
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
                        LogError("DeleteDataset", err1 + ', ' + err2);
                        callback(false);
                    } else {
                        callback(true);
                    }

                    exports.DeleteEvent(content["event_tree"], false, function(){});
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

/** Deletes this event, and recurses to delete all child events (and all their
 * children). Aka, prunes tree.
 * 
 * @param {string uuid} event_id
 * @param {bool} deleteChildInParent If true, will remove the child from parent's list of children. Should almost always be true.
 * @param {function} callback false if error occured, undefined otherwise.
 */
exports.DeleteEvent = function(event_id, deleteChildInParent, callback) {
    exports.GetRow("event", "id", event_id, function(event) {
        if (typeof event !== "undefined") {

            // Remove from parent's list of children
            if (event.parent !== "undefined" && deleteChildInParent === true) {
                exports.UpdateRowModifyList("event", "id", event["parent"], "children", event["id"], "remove",
                        function(err) {
                            if (err) {
                                LogError("DeleteEvent", err);
                            }
                        });
            }

            var cleanup = function(err1) {
                exports.DeleteRow("event", "id", event_id, function(err2) {
                    if (err1 || err2) {
                        LogError("DeleteEvent", err1 + ", " + err2);
                        callback(false);
                    } else {
                        callback();
                    }
                });
            };

            //log.info("Children of this event: " + event["children"]);
            //log.info("Event: " + event);

            if (event["children"] !== null) {
                // Recursively remove each child in series
                async.eachSeries(event["children"], function(child, childCallback) {
                    exports.DeleteEvent(child, false, childCallback);
                }, cleanup);
            } else {
                // No children to delete.
                cleanup();
            }
        } else {
            callback(false);
        }
    });

};


exports.GetChildrenEvents = function(event_id, callback) {
    log.info("Getting event " + event_id);
    exports.GetRow("event", "id", event_id, function(event) {
        if (typeof event !== "undefined") {
            var results = [];
            if (event["children"] === null) {
                log.info("Event " + event_id + " has no children.");
                event["children"] = [];
                results.push(event);
                callback(results);
            } else {
                results.push(event);
                async.eachLimit(event["children"], 2, function(child_uuid, asyncFinishedCallback) {
                    log.info("Getting child " + child_uuid);
                    exports.GetChildrenEvents(child_uuid, function(event_children) {
                        //console.log("Got event " + event_id + "'s children");
                        for (var i = 0; i < event_children.length; i++) {
                            log.info("adding child " + event_children[i]["id"]);
                            results.push(event_children[i]);
                        }
                        asyncFinishedCallback();
                    });
                }, function(err) {
                    if (err) {
                        log.warn("Error getting children: " + err);
                    }
                    log.info("Sending event " + event_id + " results back (length " + results.length + ")");
                    callback(results);
                });
            }
        } else {
            log.info("Child event doesn't exist. " + event_id);
            callback([]);
        }
    });
};