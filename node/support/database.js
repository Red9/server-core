
var spawn = require('child_process').spawn;
var underscore = require('underscore')._;
var validator = require('validator');
var log = require('./../support/logger').log;

var async = require('async');
var moment = require('moment');

var cassandraClient = require('node-cassandra-cql').Client;
var hosts = ['localhost:9042'];
var cassandra = new cassandraClient({hosts: hosts, keyspace: 'dev'});

var config = require('./../config');

var dataset_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'raw_data',
        hint: 'uuid'
    },
    {
        key: 'name',
        hint: 'varchar'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
    },
    {
        key: 'create_user',
        hint: 'uuid'
    },
    {
        key: 'start_time',
        hint: 'timestamp'
    },
    {
        key: 'end_time',
        hint: 'timestamp'
    },
    {
        key: 'processing_config',
        hint: 'varchar'
    },
    {
        key: 'processing_notes',
        hint: 'varchar'
    },
    {
        key: 'processing_statistics',
        hint: 'varchar'
    },
    {
        key: 'summary_statistics',
        hint: 'varchar'
    },
    {
        key: 'number_rows',
        hint: 'int'
    },
    {
        key: 'filename',
        hint: 'varchar'
    },
    {
        key: 'scad_unit',
        hint: 'varchar'
    },
    {
        key: 'column_titles',
        hint: 'list<varchar>'
    }
];

var event_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'dataset',
        hint: 'uuid'
    },
    {
        key: 'start_time',
        hint: 'timestamp'
    },
    {
        key: 'end_time',
        hint: 'timestamp'
    },
    {
        key: 'type',
        hint: 'varchar'
    },
    {
        key: 'summary_statistics',
        hint: 'varchar'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
    }
];

var user_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'display_name',
        hint: 'varchar'
    },
    {
        key: 'google_id',
        hint: 'varchar'
    },
    {
        key: 'email',
        hint: 'varchar'
    },
    {
        key: 'first',
        hint: 'varchar'
    },
    {
        key: 'last',
        hint: 'varchar'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
    }
];

var raw_data_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'time',
        hint: 'timestamp'
    },
    {
        key: 'data',
        hint: 'list<float>'
    }
];


var schemas = {
    dataset: dataset_schema,
    event: event_schema,
    user: user_schema,
    raw_data: raw_data_schema
};


/** Returns the matching schema for the requested table.
 * 
 * @param {string} table name
 * @returns {object} Schema
 */
function getSchema(table) {
    if (table in schemas) {
        return schemas[table];
    } else {
        return [];
    }
}

var extractSchemaVariablesFromRequest = function(request, table) {
    var schema = getSchema(table);
    var result = {};
    for (var i = 0, max = schema.length; i < max; i++) {
        if (typeof request.param(schema[i]['key']) !== 'undefined') {
            var values = request.param(schema[i]['key']).split(',');
            result[schema[i]['key']] = {
                hint: schema[i]['hint'],
                json: schema[i]['json'],
                value: values
            };
        }
    }

    return result;
};


/**
 * 
 * @param {Object} source
 * @param {Array} path
 * @returns {primative or undefined}
 */
function GetValueFromPathAndRecurse(source, path) {
    var key = path.shift();
    if (path.length === 0) {
        return source[key];
    } else if (typeof source[key] === 'undefined') {
        return;
    } else {
        return GetValueFromPathAndRecurse(source[key], path);
    }
}

function GetValueFromPath(source, path) {
    // Check the paramater types
    if (underscore.isArray(path) === true
            || path.length > 0
            || underscore.isObject(source) === true) {

        var result = GetValueFromPathAndRecurse(source, path);
        if (underscore.isObject(result) === true
                || underscore.isArray(result) === true) {
            return;
        } else {
            return result;
        }
    } else { // Parameter types invalid
        return;
    }
}


/**
 * // Compares number to number, if available.
 * // Case insensitive for string comparisons
 * @param {type} object
 * @param {type} constraints
 * @returns {boolean} true if it fits constraints, false otherwise
 */
function CheckConstraints(object, constraints) {

    for (var key in constraints) {
        var path = key.split('.');
        if (path[path.length - 1] === 'less') {
            path.pop();
            var value = GetValueFromPath(object, path);
            if (typeof value !== 'number') {
                return false;
            }
            for (var i = 0; i < constraints[key].length; i++) {
                if (value < constraints[key][i]) {
                    return true;
                }
            }
            return false;
        } else if (path[path.length - 1] === 'more') {
            path.pop();
            var value = GetValueFromPath(object, path);
            if (typeof value !== 'number') {
                return false;
            }
            for (var i = 0; i < constraints[key].length; i++) {
                if (value > constraints[key][i]) {
                    return true;
                }
            }
            return false;

        } else { // Test for equality
            var value = GetValueFromPath(object, path);
            for (var i = 0; i < constraints[key].length; i++) {
                if (value === constraints[key][i]) {
                    return true;
                } else if (underscore.isString(value) === true
                        && underscore.isString(constraints[key][i]) === true
                        && value.toUpperCase() === constraints[key][i].toUpperCase()) {
                    return true;
                }
                return false;
            }
        }
    }
    return true; // For the case where there are no keys.
}




/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function generateUUID() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return (_p8() + _p8(true) + _p8(true) + _p8());
}

/**
 * @param {map} schema The schema to extract from the row
 * @param {node-cassandra-cql row} row
 * @returns {map} where key:value pairs whose keys are schema.
 */
function ExtractRowToJSON(schema, row) {
    content = {};
    for (var i = 0; i < schema.length; i++) {
        var value = row.get(schema[i]['key']);

        if (schema[i]['hint'] === 'timestamp') {
            value = moment(value).valueOf(); // Get Milliseconds
        } else {
            try { // Make it a JSON object if it's stringified.
                value = JSON.parse(value);
            } catch (e) {
                // Do nothing;
            }
        }

        content[schema[i]['key']] = value;
    }
    return content;
}



exports.extractSchemaVariablesFromRequest = extractSchemaVariablesFromRequest;


/** Get a single row identified by id from the table specified.
 * 
 * @param {string} tableName The CQL name of the table.
 * @param {string} key The cassandra row key
 * @param {string or node-cassandra-cql datatype} value the value for that key.
 * @param {function} callback (content) If not found content is undefined. Otherwise it's a JSON with table schema.
 */
function GetRow(tableName, key, value, callback) {
    var databaseCommand = "SELECT ";
    var schema = schemas[tableName];

    databaseCommand += schema[0]['key'];
    for (var i = 1; i < schema.length; i++) {
        databaseCommand += "," + schema[i]['key'];
    }

    databaseCommand += " FROM " + tableName + " WHERE " + key + " = ?";

    cassandra.execute(databaseCommand, [value], function(err, result) {
        var content;
        if (err) {
            LogError("GetRow", err);
        } else {
            if (result.rows.length !== 1) {
                LogError("GetRow", "Database errror: UUID not unique! Incorrect number of results ("
                        + result.rows.length + ") for query '" + databaseCommand + "' with parameter '" + value + "'");
            } else {
                //console.log("Row: " + JSON.stringify(result.rows[0]));
                content = ExtractRowToJSON(schema, result.rows[0]);
            }
        }
        callback(content);
    });
}


function validateConstraints(constraints) {
    for (var key in constraints) {

        constraints[key] = constraints[key].split(',');
        for (var i = 0; i < constraints[key].length; i++) {
            if (isNaN(constraints[key][i]) === false) {
                constraints[key][i] = +constraints[key][i];
            }
        }
    }

    return constraints;
}


function flushDatasetBody(dataset, callback) {
    GetRow('user', 'id', dataset['create_user'], function(user) {
        var minimal_user = {
            id: dataset['create_user'],
            display_name: user['display_name'],
            first: user['first'],
            last: user['last'],
            email: user['email']
        };
        dataset['create_user'] = minimal_user;
        callback(dataset);
    });
}

/**
 *  Constraints are a list of things that fit:
 *  {
 *      path.to.key:value,
 *      path.to.key2:value2
 *  }
 *  
 *  Note that the path can include .less or .more postfixes. The value can
 *  include comma seperated values.
 *  
 *  If you want all datasets don't give any constraints.
 * 
 * @param {object} constraints
 * @param {function} callback list of datasets objects
 * @returns {undefined}
 */
exports.getConstrainedDatasets = function(constraints, callback) {
    constraints = validateConstraints(constraints);

    var database_command = 'SELECT * FROM ' + 'dataset';
    var result = [];
    cassandra.eachRow(database_command,
            function(n, row) {
                var dataset = ExtractRowToJSON(schemas['dataset'], row);
                if (CheckConstraints(dataset, constraints) === true) {
                    result.push(dataset);
                } else {
                    // Dataset failed constraints
                }
            },
            function(err, rowLength) {
                if (err) {
                    LogError("GetConstrainedDataset", err);
                    callback([]);
                } else {
                    var final_result = [];
                    async.each(result,
                            function(item, callback) {
                                flushDatasetBody(item, function(flushed_dataset) {
                                    final_result.push(flushed_dataset);
                                    callback();
                                });
                            },
                            function(err) {
                                callback(final_result);
                            });
                }
            }
    );
};


/** See getConstrainedDatasets for more info
 * 
 * @param {type} constraints
 * @param {type} callback
 * @returns {undefined}
 */
exports.getConstrainedEvents = function(constraints, callback) {
    constraints = validateConstraints(constraints);
    var database_command = 'SELECT * FROM ' + 'event';
    var result = [];
    cassandra.eachRow(database_command,
            function(n, row) {
                var event = ExtractRowToJSON(schemas['event'], row);
                if (CheckConstraints(event, constraints) === true) {
                    result.push(event);
                } else {
                    // Event failed constraints
                }
            },
            function(err, rowLength) {
                if (err) {
                    LogError('GetConstrainedEvent', err);
                    callback([]);
                } else {
                    callback(result);
                }
            }
    );
};

exports.getDataset = function(id, callback) {
    GetRow('dataset', 'id', id, function(dataset_raw) {
        flushDatasetBody(dataset_raw, callback);
    });
};

exports.getEvent = function(id, callback) {
    GetRow('event', 'id', id, callback);
};

exports.getUser = function(id, callback) {
    GetRow('user', 'id', id, callback);
};

exports.getUserByEmail = function(email, callback) {
    GetRow('user', 'email', email, callback);
};

function computeColumns(panelParameters, dataset, commandOptions) {
    var columns = dataset['column_titles'];
    if (typeof panelParameters['axes'] !== 'undefined') {
        //Get the intersection with the Dataset axes
        // so that we only request columns that we actually have.

        columns = underscore.intersection(
                panelParameters['axes'].split(','), dataset['column_titles']);

        if (columns.length === 0) {
            // Default to all axes if the intersection returns an empty set.
            columns = dataset['column_titles'];
        }
    }

    //result['columns'] = columns;

    var columnString = "";

    underscore.each(columns, function(value, index, list) {
        if (index === 0) {
            columnString = value;
        } else {
            columnString += ',' + value;
        }
    });

    if (columnString !== "") {
        commandOptions.push('--columns');
        commandOptions.push(columnString);
    }

    return columns;
}



function extractParameters(panelParameters, dataset) {
    var result = {};

    var commandOptions = [];

    commandOptions.push('-jar');
    commandOptions.push(config.downsamplerPath);

    commandOptions.push('--uuid');
    commandOptions.push(dataset['id']);


    if (typeof panelParameters['minmax'] !== 'undefined') {
        commandOptions.push('--minmax');
    }

    if (typeof panelParameters['nocache'] !== 'undefined') {
        commandOptions.push('--nocache');
    }

    if (typeof panelParameters['start_time'] !== 'undefined') {
        if (validator.isNumeric(panelParameters['start_time']) === true) {
            commandOptions.push('--start_time');
            commandOptions.push(panelParameters['start_time']);
        }
    }

    if (typeof panelParameters['end_time'] !== 'undefined') {
        if (validator.isNumeric(panelParameters['end_time']) === true) {
            commandOptions.push('--end_time');
            commandOptions.push(panelParameters['end_time']);
        }
    }

    if (typeof panelParameters['buckets'] !== 'undefined') {
        if (validator.isInt(panelParameters['buckets']) === true) {
            commandOptions.push('--buckets');
            commandOptions.push(panelParameters['buckets']);
        }
    }

    result['columns'] = computeColumns(panelParameters, dataset, commandOptions);

    result['format'] = 'csv'; // Default to CSV
    if (typeof panelParameters['format'] !== 'undefined') {
        if (panelParameters['format'] === 'csv') {
            result['format'] = 'csv';
        } else { // Default to JSON
            result['format'] = 'json';
        }
    }

    result['commandOptions'] = commandOptions;


    return result;
}


function SpawnDownsampler(commandOptions, format, callbackData, callbackDone) {
    var downsampler = spawn('java', commandOptions);

    var readline = require('readline');
    var stdin = readline.createInterface({
        input: downsampler.stdout,
        output: downsampler.stdin
    });

    var stderr = readline.createInterface({
        input: downsampler.stderr,
        output: downsampler.stdin
    });


    stdin.on('line', function(line) {
        if (format === 'csv') {
            callbackData(line);
        } else if (format === 'json') {
            // Convert from strings to numerical values.
            line = line.split(",");
            line[0] = parseInt(line[0]);
            for (var i = 1; i < line.length; i++) {
                // Check to see if the values have min/avg/max.
                if (line[i].split(';').length > 1) {
                    line[i] = line[i].split(';');
                    for (var j = 0; j < line[i].length; j++) {
                        line[i][j] = parseFloat(line[i][j]);
                    }
                } else {
                    line[i] = parseFloat(line[i]);
                }
            }
            callbackData(line);
        }
    });

    var stderrOutput = "";
    stderr.on('line', function(line) { // Most of the time not used.
        stderrOutput += line + "\n";
    });

    downsampler.on('close', function(code) {
        stdin.close();
        stderr.close();
        if(stderrOutput !== ""){
            log.warn("Standard error not empty: " + stderrOutput);
        }
        
        if (code !== 0) {
            log.warn('Downsampler non zero exit: ' + code);
            callbackDone('Downsampler non zero exit: ' + code);
        } else {
            callbackDone();
        }
    });
}

exports.getPanel = function(datasetId, panelParameters,
        callbackDataset, callbackData, callbackDone) {
    GetRow('dataset', 'id', datasetId, function(dataset) {
        if (typeof dataset === 'undefined') {
            callbackDone('No dataset matches ID');
        } else {
            var parameters = extractParameters(panelParameters, dataset);

            callbackDataset(dataset, parameters['columns']);

            SpawnDownsampler(parameters['commandOptions'], parameters['format'],
                    callbackData, callbackDone);

        }
    });
};