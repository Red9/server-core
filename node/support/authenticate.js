
var database = require('./../support/database');
var log = require('./../support/logger').log;

/**
 * 
 * @param {type} id
 * @param {type} user
 * @param {type} callback function(user uuid) or "" if not found.
 * @returns {undefined}
 */
exports.CheckUserForLogin = function(id, user, callback) {
    database.GetUserByEmail(user.emails[0].value, function(result) {
        callback(result);
    });
};

/**
 * 
 * @param {type} identifier
 * @param {type} profile
 * @param {type} callback
 * @returns {undefined}
 */
exports.AddUser = function(identifier, profile, callback) {

    var uuid = database.GenerateUUID();

    var user_params = {
        id: uuid,
        display_name: profile.displayName,
        google_id: identifier,
        email: profile.emails[0].value,
        first: profile.name.givenName,
        last: profile.name.familyName
    };

    database.InsertUser(user_params, function() {
        callback(user_params);
    });
};

