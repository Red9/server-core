var log = requireFromRoot('support/logger').log;
var config = requireFromRoot('config');

var userResource = requireFromRoot('support/resources/user');

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
    userResource.get({email: user.emails[0].value}, function(result) {
        callback(result[0]);
    });
};

exports.processOfflineRequest = function(username, password, callback) {
    console.log('Getting user...');
    userResource.get({email: 'offline.user@redninesensor.com'}, function(result) {
        console.log('Callback user...');
        callback(null, result[0]);
    });
};

/** Check if this authentication attempt should be validated or denied.
 *  
 * @param {type} identifier
 * @param {map} profile
 * @param {function} callback
 * @returns {undefined}
 */
exports.ProcessLoginRequest = function(identifier, profile, callback) {
    exports.CheckUserForLogin(identifier, profile, function(user_info) {
        if (typeof user_info !== "undefined") {
            // If it's not undefined, then they're in the database. So they have access.
            log.info('Login attempt by "' + user_info.displayName + '" (' + user_info.id + ') successful');
            callback(null, user_info);
        } else {
            // If it is undefined, then they're not in the database.
            // Let's try to get the domain of their email.
            var email_domain = "";
            try {
                email_domain = profile.emails[0].value.replace(/.*@/, "");
            } catch (ex) {
                //Do nothing...
                log.info('Could not parse login email: ' + ex.toString());
            }

            // All redninesensor.com emails are valid, so add them to the database and give them access.
            log.info("attempt domain: " + email_domain);
            if (email_domain === "redninesensor.com") {

                var newUser = {
                    displayName: profile.displayName,
                    email: profile.emails[0].value,
                    givenName: profile.name.givenName,
                    familyName: profile.name.familyName,
                    preferredLayout: {}
                };

                userResource.create(newUser, function(err, createdUserList) {
                    var createdUser = createdUserList[0];
                    if (err) {
                        log.error('Could not create new user "' + createdUser.displayName + '" (' + createdUser.id + '): ' + err);
                        callback(err);
                    } else {
                        log.info('Created new user "' + createdUser.displayName + '" (' + createdUser.id + ')');
                        callback(undefined, createdUser);
                    }
                });
            } else {
                // Not in the database, and no redninesensor.com email. Don't authenticate.
                log.info('Login attempt from "' + profile.emails[0].value + '"');
                callback(null, false);
            }
        }
    });
};