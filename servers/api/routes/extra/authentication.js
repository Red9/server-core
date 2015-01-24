'use strict';

var Boom = require('boom');
var nconf = require('nconf');
var _ = require('lodash');

/**
 * @param {Object} request
 * @param {Object} models
 * @param {Object} providedUser Object with keys that match the user resource.
 *                               At a minimum, it should have email.
 * @param {Function} callback (err, validUserObject)
 */
function checkUserAuthentication(request, models, providedUser, callback) {

    models.user
        .findOne({where: {email: providedUser.email}})
        .then(function (user) {
            if (typeof user === 'undefined') {
                callback(null);
            } else {
                // Found a user.
                // Now, update their profile with the most recently provided
                // information. Allow the user to set a Red9 specific display
                // name (we don't want to automatically update that)
                if (user.displayName !== 'unknown') {
                    delete providedUser.displayName;
                }

                user.gender = providedUser.gender;
                user.picture = providedUser.picture;
                user.givenName = providedUser.givenName;
                user.familyName = providedUser.familyName;

                user.save().then(function () {
                    callback(null, user);
                });
            }
        })
        .catch(function (err) {
            request.log(['error'], 'Error in user login: ' + err);
            callback(err);
        });
}

exports.init = function (server, models) {
    server.auth.strategy('session', 'cookie', {
        password: nconf.get('cookie:password'), // random string
        cookie: nconf.get('cookie:name'),
        domain: nconf.get('cookie:domain'),
        clearInvalid: true,
        redirectTo: false,
        isSecure: false,
        validateFunc: function (session, callback) {
            // TODO: Check database here for valid session (not just valid user)
            models.user.findOne({where: {id: session.id}})
                .then(function (user) {
                    if (!user) {
                        callback(null, false);
                    } else {
                        callback(null, true, user);
                    }
                })
                .catch(function (err) {
                    callback(err, false);
                });
        }
    });

    // Declare an authentication strategy using the bell scheme
    // with the name of the provider, cookie encryption password,
    // and the OAuth client credentials.
    server.auth.strategy('google', 'bell', {
        provider: 'google',
        password: nconf.get('auth:providers:google:password'),
        clientId: nconf.get('auth:providers:google:clientId'),
        clientSecret: nconf.get('auth:providers:google:clientSecret'),
        scope: nconf.get('auth:providers:google:scope'),
        isSecure: false     // Terrible idea but required if not using HTTPS
    });

    server.auth.default({
        mode: 'required',
        strategy: 'session'
    });

    // Use the 'twitter' authentication strategy to protect the
    // endpoint handling the incoming authentication credentials.
    // This endpoints usually looks up the third party account in
    // the database and sets some application state (cookie) with
    // the local application account information.
    server.route({
        method: ['GET', 'POST'], // Must handle both GET and POST
        path: '/auth/google', // The callback endpoint registered with provider
        config: {
            auth: 'google',
            handler: function (request, reply) {

                // Perform any account lookup or registration, setup local
                // session, and redirect to the application. The third-party
                // credentials are stored in request.auth.credentials. Any
                // query parameters from the initial request are passed back
                // via request.auth.credentials.query.

                var normalizedUser = {
                    email: request.auth.credentials.profile.email,
                    //jscs:disable
                    givenName: request.auth.credentials.profile.raw.given_name,
                    familyName: request.auth.credentials.profile.raw.family_name,
                    //jscs:enable
                    displayName: request.auth.credentials.profile.displayName,
                    gender: request.auth.credentials.profile.raw.gender,
                    picture: request.auth.credentials.profile.raw.picture
                };

                checkUserAuthentication(request, models, normalizedUser,
                    function (err, validUser) {
                        var callbackUrl = nconf.get('defaultCallbackUrl');
                        if (request.auth.credentials.query.callbackUrl) {
                            callbackUrl = decodeURIComponent(
                                request.auth.credentials.query.callbackUrl
                            );
                        }

                        if (typeof validUser !== 'undefined') {
                            request.auth.session.set({id: validUser.id});
                            reply.redirect(callbackUrl);
                        } else {
                            request.auth.session.clear();

                            var error = Boom.unauthorized('User "' +
                            normalizedUser.displayName + '" ( ' +
                            normalizedUser.email +
                            ' ) is not in our database.');

                            reply.redirect(
                                nconf.get('unauthorizedCallbackUrl') +
                                '?attemptUrl=' +
                                encodeURIComponent(callbackUrl) +
                                '&error=' +
                                JSON.stringify(error.output.payload));
                        }
                    });
            },
            description: 'Perform Google+ Authentication',
            notes: 'Returns HTML that should be displayed to the user, which ' +
            'is unique for this server. On success it will redirect to ' +
            'callbackURL. Do not POST this endpoint, only GET.',
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
            tags: ['api'],
            auth: {
                mode: 'try',
                strategy: 'session'
            }
        }
    });

    server.route({
        method: 'GET',
        path: '/auth/current',
        config: {
            handler: function (request, reply) {
                //console.log('Credentials: ');
                //console.dir(request.auth.credentials);
                if (_.isNull(request.auth.credentials)) {
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
            description: 'Get the current logged in user',
            notes: 'Returns the current user who is logged in, otherwise ' +
            'returns an unauthorized error. Uses the "' +
            nconf.get('authorizationCookieName') + '" cookie.',
            tags: ['api']
        }
    });
};
