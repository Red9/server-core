var Boom = require('boom');
var nconf = require('nconf');
/**
 *
 * @param providedUser with keys:
 *
 * email
 * givenName
 * familyName
 * displayName
 *
 *
 *
 * @param callback {err, validUserObject}
 */
function checkUserAuthentication(resources, providedUser, callback) {
    var user;
    resources.user.find({email: providedUser.email}, {},
        function (user_) {
            user = user_;
        }, function (err) {
            if (err) {
                console.log('Error in user login: ' + err);
            }
            if (typeof user === 'undefined') {
                callback(null);
            } else {
                // Found a user.
                callback(null, user);
            }
        });
}


exports.init = function (server, resources) {
    server.auth.strategy('session', 'cookie', 'try', {
        password: '867cfa6cal5-c80eouwvvrl-4aba4ad-92atueh2-e4c737otauh76e129a', // random string
        cookie: 'r9session',
        clearInvalid: true,
        redirectTo: false,
        isSecure: false,
        validateFunc: function (session, callback) {
            // TODO: Check cassandra here for valid session.
            callback(null, session);
        }
    });

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('google', 'bell', {
        provider: 'google',
        password: 'cookie_encryption_password',
        clientId: '464191550717-i49tpiq3a2kvosd0ljn6rvk13ib3bv23.apps.googleusercontent.com',
        clientSecret: 'm6OYo8hpLAMaK-U-QBtItRJP',
        scope: ['profile', 'email'],
        isSecure: false     // Terrible idea but required if not using HTTPS
    });

    // Use the 'twitter' authentication strategy to protect the
    // endpoint handling the incoming authentication credentials.
    // This endpoints usually looks up the third party account in
    // the database and sets some application state (cookie) with
    // the local application account information.
    server.route({
        method: ['GET', 'POST'], // Must handle both GET and POST
        path: '/auth/google',    // The callback endpoint registered with the provider
        config: {
            auth: 'google',
            handler: function (request, reply) {

                // Perform any account lookup or registration, setup local session,
                // and redirect to the application. The third-party credentials are
                // stored in request.auth.credentials. Any query parameters from
                // the initial request are passed back via request.auth.credentials.query.

                var normalizedUser = {
                    email: request.auth.credentials.profile.email,
                    givenName: request.auth.credentials.profile.raw.given_name,
                    familyName: request.auth.credentials.profile.raw.family_name,
                    displayName: request.auth.credentials.profile.displayName,
                    gender: request.auth.credentials.profile.raw.gender,
                    picture: request.auth.credentials.profile.raw.picture
                };

                checkUserAuthentication(resources, normalizedUser, function (err, validUser) {
                    var callbackUrl = nconf.get('defaultCallbackUrl');
                    if (request.auth.credentials.query.callbackUrl) {
                        callbackUrl = request.auth.credentials.query.callbackUrl
                    }

                    if (typeof validUser !== 'undefined') {
                        request.auth.session.set(validUser);
                        reply.redirect(callbackUrl);
                    } else {
                        request.auth.session.clear();

                        var error = Boom.unauthorized('User "' + normalizedUser.displayName + '" ( ' + normalizedUser.email + ' ) is not in our database.');
                        reply.redirect(nconf.get('unauthorizedCallbackUrl') + '?attemptUrl=' + encodeURIComponent(callbackUrl) + '&error=' + JSON.stringify(error.output.payload));
                    }
                });
            },
            description: 'Perform Google+ Authentication',
            notes: 'Unique API endpoint. Returns HTML that should be displayed to the user. On sucess it will redirect to callbackURL. Do not POST this endpoint.',
            tags: ['api']
        }
    });


    server.route({
        method: 'POST',
        path: '/auth/logout',
        config: {
            handler: function (request, reply) {
                request.auth.session.clear();
                reply({'message': 'session cleared.'});
            },
            description: 'Delete the current session',
            notes: 'Delete the current session, if any.',
            tags: ['api']
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/current',
        config: {
            handler: function (request, reply) {
                //console.log('Credentials: ');
                //console.dir(request.auth.credentials);
                if (typeof request.auth.credentials === 'undefined') {
                    reply(Boom.unauthorized('Not logged in.'));
                } else {
                    reply({
                        user: request.auth.credentials
                    });
                }
            },
            auth: { // Explicitly allow for no session
                mode: 'try',
                strategy: 'session'
            },
            description: 'Get the currrent logged in user',
            notes: 'Returs the current user who is logged in, otherwise returns an unauthorized error.',
            tags: ['api']
        }
    });
};
