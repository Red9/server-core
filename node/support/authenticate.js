
var database = require('./../support/database');
var log = require('./../support/logger').log;

/**
There's a bit of a problem with the schema here. It assumes that the email is
unique, but it's not a primary key. Something should be done to consider that.
*/


/**
 * 
 * @param {string} id
 * @param {map} user
 * @param {type} callback function(user uuid) or "" if not found.
 */
exports.CheckUserForLogin = function(id, user, callback) {
    database.GetRow("user", "email", user.emails[0].value, function(result) {
        callback(result);
    });
};

/**
 * 
 * @param {string} identifier the google id
 * @param {map} profile
 * @param {function} callback Called back with the created user information.
 */
exports.AddUser = function(identifier, profile, callback) {

    var uuid = database.GenerateUUID();

    var user_params = {
        id: uuid,
        display_name: profile.displayName,
        google_id: identifier,
        email: profile.emails[0].value,
        first: profile.name.givenName,
        last: profile.name.familyName,
        create_time: Date.now()
    };

    database.InsertRow("user", user_params, function(err) {
        callback(user_params);
    });
};

/** Check if this authentication attempt should be validated or denied.
 *  
 * @param {type} identifier
 * @param {map} profile
 * @param {function} done
 * @returns {undefined}
 */
exports.ProcessLoginRequest = function(identifier, profile, done) {
    exports.CheckUserForLogin(identifier, profile, function(user_info) {
        if (typeof user_info !== "undefined") {
            // If it's not undefined, then they're in the database. So they have access.
            log.info("Login attempt (successful)");
            done(null, user_info);
        } else {
            // If it is undefined, then they're not in the database.
            log.info("Login attempt (failed)");

            // Let's try to get the domain of their email.
            var email_domain = "";
            try {
                email_domain = profile.emails[0].value.replace(/.*@/, "");
            } catch (ex) {
                //Do nothing...
                log.info("Could not parse login email: " + ex.toString());
            }
            
            // All redninesensor.com emails are valid, so add them to the database and give them access.
            log.info("attempt domain: " + email_domain);
            if (email_domain === "redninesensor.com") {
                exports.AddUser(identifier, profile, function(new_user_info) {
                    done(null, new_user_info);
                });
            } else {
                // Not in the database, and no redninesensor.com email. Don't authenticate.
                done(null, false);
            }
        }
    });
};