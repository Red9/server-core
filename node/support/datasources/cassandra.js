var moment = require('moment');
var underscore = require('underscore')._;
var validator = require('validator');

var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var cassandraClient = require('node-cassandra-cql').Client;
var cassandraDatabase = new cassandraClient({hosts: config.cassandraHosts, keyspace: config.cassandraKeyspace});

exports.getAll = function(type, callbackItem, callbackDone) {
    var command = 'SELECT * FROM ' + resources[type].table;
    exports.rawGetAll(command, [], type, callbackItem, callbackDone);
};

exports.rawGetAll = function(command, parameters, type, callbackItem, callbackDone) {
    cassandraDatabase.eachRow(command, parameters,
            function(n, row) {
                var item = ExtractRowToJSON(resources[type].schema, row);
                callbackItem(item);
            },
            function(err, rowLength) {
                if (err) {
                    LogError('databaseCassandra.rawGetAll', err);
                }
                callbackDone(err);
            });
};

exports.getSingle = function(type, id, callback) {
    var command = 'SELECT * FROM ' + resources[type].table + ' WHERE id=?';
    cassandraDatabase.execute(command, [id], function(err, result) {
        var content;
        if (err) {
            LogError('databaseCassandra.getSingle', err);
        } else {
            if (result.rows.length === 0) {
                // Nothing wrong, just not found...
            }
            else if (result.rows.length > 1) {
                LogError('databaseCassandra.getSingle', 'Multiple result rows');
            } else {
                content = ExtractRowToJSON(resources[type].schema, result.rows[0]);
            }
        }
        callback(content);
    });
};

exports.deleteSingle = function(type, id, callback) {
    var command = 'DELETE FROM ' + resources[type].table + ' WHERE id=?';
    cassandraDatabase.execute(command, [id], function(err) {
        callback(err);
    });
};


/** Lazy checking. If we can check the type, we do. If we don't know that type
 * then we assume it's correct.
 * 
 * @param {string} hint The type to check against.
 * @param {any} value Get's it's type checked.
 * @returns {Boolean} true if checks pass, false otherwise.
 */
function checkType(hint, value) {
    // TODO(SRLM): Fill in the rest.
    if (
            (hint === 'uuid' && validator.isUUID(value) === false)
            || (hint === 'timestamp' && underscore.isDate(value) === false)) {
        return false;
    } else {
        return true;
    }
}


/**
 * 
 * @param {string} type The resource to insert into.
 * @param {object} newResource The complete row to insert (with keys matching the schema keys)
 * @param {function} callback (err)
 */
exports.addSingle = function(type, newResource, callback) {

    var schema = resources[type].schema;

    if (typeof schema === 'undefined') {
        callback("Schema not found");
        return;
    }

    var databaseRow = [];

    // Make sure that the table was a real table...
    var correctSchema = schema.length > 0 ? true : false;
    // Check that row has all the elements of the schema, and they're the correct type
    underscore.each(schema, function(column) {
        if (typeof newResource[column.key] === 'undefined') {
            //log.debug("row[" + column.key + "] === undefined");
            correctSchema = false;
        } else if (checkType(column.hint, newResource[column.key]) === false) {
            //log.debug("row[" + column.key + "] is not " + column.hint);
            correctSchema = false;
        } else {
            //log.debug('newResource[' + column.key + '] === ' + newResource[column.key]);
            databaseRow.push({
                value: newResource[column.key],
                hint: column.hint
            });
        }
    });

    if (correctSchema === false) {
        callback("Incorrect schema.");
        return;
    }

    // Construct string with CSV column titles, and string with CSV ? holders
    var queryColumns = '';
    var queryPlaceholders = '';
    underscore.each(schema, function(column, index) {
        if (index > 0) {
            queryColumns += ',';
            queryPlaceholders += ',';
        }
        queryColumns += column.key;
        queryPlaceholders += '?';
    });

    var query = 'INSERT INTO ' + resources[type].table + ' (' + queryColumns + ') VALUES (' + queryPlaceholders + ')';

    cassandraDatabase.execute(query, databaseRow, function(err) {
        if (err) {
            // Shouldn't ever happen.
            log.error('Error adding single, ' + type + ': ' + err);
            callback(err);
        } else {
            callback(undefined, newResource);
        }
    });


};

exports.updateSingle = function(type, id, updatedResource, callback) {
    var schema = resources[type].schema;

    var correctSchema = schema.length > 0 ? true : false;
    var keys = [];
    var queryParameters = [];

    underscore.each(updatedResource, function(value, key) {
        var keyIndex = checkSchemaForKey(schema, key);
        if (keyIndex < 0) {
            log.debug('schema[' + key + '] === not found');
            correctSchema = false;
        } else if (checkType(schema[keyIndex].hint, value) === false) {
            log.debug('value ' + value + ' is not ' + schema[keyIndex].hint);
            correctSchema = false;
        } else {
            keys.push(key);
            queryParameters.push({
                value: value,
                hint: schema[keyIndex].hint
            });
        }
    });

    if (correctSchema === false) {
        callback('incorrect schema');
    } else {

        var assignments = '';
        underscore.each(keys, function(key, index) {
            if (index > 0) {
                assignments += ',';
            }
            assignments += key + '=?';
        });


        queryParameters.push({
            value: id,
            hint: 'uuid'
        });

        var query = 'UPDATE ' + resources[type].table + ' SET ' + assignments + ' WHERE id=?';

        cassandraDatabase.execute(query, queryParameters, function(err) {
            if (err) {
                log.debug('err on update: ' + err);
                callback(err);
            } else {
                callback();
            }
        });
    }
};

// -----------------------------------------------------------------------------
// Private
// -----------------------------------------------------------------------------

/** Convenience function.
 * 
 * @param {type} query
 * @param {type} parameters
 * @returns {undefined}
 */
function LogCommand(query, parameters) {
    //log.info("Database command: '" + query + "' with parameters '" + parameters + "'");
}

function LogError(functionName, error) {
    log.error("Database Error in function " + functionName + ": '" + error + "'");
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

            //console.log('Value is: ' + value + ', Keys=' + Object.keys(value) + ', isNumber=' + underscore.isNumber(value) + ', isString=' + underscore.isString(value) + ', isDate=' + underscore.isDate(value) + ', v.isNumeric=' + validator.isNumeric(value));
            if (validator.isNumeric(value) === true) {
                value = parseInt(value);
            } else {
                value = moment(value).valueOf(); // Get Milliseconds
            }
        } else {/*
         try { // Make it a JSON object if it's stringified.
         value = JSON.parse(value);
         } catch (e) {
         // Do nothing;
         }*/
        }

        content[schema[i]['key']] = value;
    }
    return content;
}

function checkSchemaForKey(schema, key) {
    var keyIndex = -1;
    underscore.each(schema, function(value, index) {
        if (value.key === key) {
            keyIndex = index;
        }
    });
    if (key === -1) {
        debug.warn('Schema searched for key ' + key + ' and not found');
    }
    return keyIndex;
}


// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

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
        key: 'source',
        hint: 'varchar'
    },
    {
        key: 'owner',
        hint: 'uuid'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
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
        key: 'source',
        hint: 'varchar'
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
        key: 'preferred_layout',
        hint: 'varchar'
    }
];

var comment_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
    },
    {
        key: 'author',
        hint: 'uuid'
    },
    {
        key: 'resource_type',
        hint: 'varchar'
    },
    {
        key: 'resource',
        hint: 'uuid'
    },
    {
        key: 'body',
        hint: 'varchar'
    },
    {
        key: 'start_time',
        hint: 'timestamp'
    },
    {
        key: 'end_time',
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

var video_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'start_time',
        hint: 'timestamp'
    },
    {
        key: 'create_time',
        hint: 'timestamp'
    },
    {
        key: 'dataset',
        hint: 'uuid'
    },
    {
        key: 'host',
        hint: 'varchar'
    },
    {
        key: 'host_id',
        hint: 'varchar'
    }
];

var layout_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'title',
        hint: 'varchar'
    },
    {
        key: 'description',
        hint: 'varchar'
    },
    {
        key: 'layout',
        hint: 'varchar'
    },
    {
        key: 'for',
        hint: 'varchar'
    }
];

var raw_data_meta_schema = [
    {
        key: 'id',
        hint: 'uuid'
    },
    {
        key: 'dataset_id',
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
        key: 'create_time',
        hint: 'timestamp'
    },
    {
        key: 'columns',
        hint: 'list<varchar>'
    },
    {
        key: 'summary_statistics',
        hint: 'varchar'
    },
    {
        key: 'timezone',
        hint: 'varchar'
    }
];

var resources = {
    dataset: {
        table: 'dataset',
        schema: dataset_schema
    },
    event: {
        table: 'event',
        schema: event_schema
    },
    user: {
        table: 'user',
        schema: user_schema
    },
    panel: {
        table: 'raw_data',
        schema: raw_data_schema
    },
    panelProperties: {
        table: 'raw_data_meta',
        schema: raw_data_meta_schema
    },
    comment: {
        table: 'comment',
        schema: comment_schema
    },
    video: {
        table: 'video',
        schema: video_schema
    },
    layout: {
        table: 'layout',
        schema: layout_schema
    }
};