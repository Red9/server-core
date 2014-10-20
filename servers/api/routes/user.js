var Joi = require('joi');
var stream = require('stream');

var routeHelp = require('./../support/routehelp');

exports.init = function (server, resource) {
    var listResponse = routeHelp.createListResponse(resource.user.find);

    var resultModelRaw = {
        id: routeHelp.idValidator.description('resource UUID'),
        email: Joi.string().email().description('user email address.'),
        displayName: Joi.string().description("user's preferred public handle."),
        givenName: Joi.string().description('first name'),
        familyName: Joi.string().description('last name'),
        preferredLayout: Joi.object().description('layouts for user.')
    };

    var resultModel = Joi.object({
        id: resultModelRaw.id.required(),
        email: resultModelRaw.id.required(),
        displayName: resultModelRaw.displayName.required(),
        email: resultModelRaw.email.required(),
        givenName: resultModelRaw.givenName.required(),
        familyName: resultModelRaw.familyName.required(),
        preferredLayout: resultModelRaw.preferredLayout
    }).options({
        className: 'user'
    });

    var resultModelList = Joi.array().includes(resultModel);

    server.route({
        method: 'GET',
        path: '/user/{id?}',
        handler: function (request, reply) {
            var filters = {};
            if (request.params.id) {
                filters.id = request.params.id;
            }
            listResponse(filters, reply);
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                }
            },
            description: 'Get user(s)',
            notes: 'Get user(s) that fit the parameters.',
            tags: ['api'],
            response: {
                schema: resultModelList
            }
        }
    });

    server.route({
        method: 'PUT',
        path: '/user/{id}',
        handler: function (request, reply) {
            reply();
        },
        config: {
            validate: {
                params: {
                    id: resultModelRaw.id
                },
                payload: {
                    email: resultModelRaw.id,
                    displayName: resultModelRaw.displayName,
                    email: resultModelRaw.email,
                    givenName: resultModelRaw.givenName,
                    familyName: resultModelRaw.familyName,
                    preferredLayout: resultModelRaw.preferredLayout
                }
            },
            description: 'Update user',
            notes: 'Update user with new value(s)',
            tags: ['api'],
            response: {
                schema: resultModel
            }
        }
    });
};