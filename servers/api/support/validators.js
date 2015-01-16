"use strict";

var Joi = require('joi');

// Version 4 UUID
var idRegex = new RegExp(/([0-9]*)/); // A bit of a hack for now while we move to Postgresql.
//var singleId = new RegExp('^' + idRegex.source + '$');
var csvId = new RegExp('^(' + idRegex.source + ',)*' + idRegex.source + '$');

exports.id = Joi.number().integer().min(1).description('unique Red9 UUID key');
exports.idCSV = Joi.string().regex(csvId).description('multiple unique Red9 UUID keys in a CSV list.');
exports.timestamp = Joi.number().integer().min(0).unit('milliseconds').meta({timestamp: true}).description('milliseconds since epoch (Unix time)');
exports.createTime = exports.timestamp.description('The time that this resource was created.');
exports.duration = Joi.number().integer().min(1).unit('milliseconds');
exports.multiArray = function (single) {
    return Joi.alternatives(single, Joi.array().includes(single)).description('multiple key instances or array of ' + single._description);
};

exports.summaryStatistics = Joi.object().description('numerically summarizes a period of time from a panel').options({
    className: 'summaryStatistics'
});

// Taken from here: https://github.com/hapijs/joi/issues/472
exports.stream = Joi.object({
    pipe: Joi.func().required()
}).unknown().description('A file stream');

exports.fields = Joi.string().description('specify a CSV list of the object keys that you want returned');

exports.scope = Joi.array().includes(Joi.string().valid('basic', 'trusted', 'admin')).description('The permission scope for this user');