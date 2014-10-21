var Joi = require('joi');
var stream = require('stream');

var routeHelp = require('./../support/routehelp');

exports.init = function (server, resources) {


    routeHelp.createCRUDRoutes(server, resources.user);
};