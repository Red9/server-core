'use strict';

var _ = require('lodash');
var Joi = require('joi');

// A bit of a hack for now while we move to Postgresql.
var idRegex = new RegExp(/([0-9]*)/);
var csvId = new RegExp('^(' + idRegex.source + ',)*' + idRegex.source + '$');

exports.id = Joi.number().integer().min(1)
    .description('unique Red9 UUID key');
exports.idCSV = Joi.string().regex(csvId)
    .description('multiple unique Red9 UUID keys in a CSV list.');
exports.timestamp = Joi.number().integer().min(0)
    .unit('milliseconds')
    .meta({timestamp: true})
    .description('milliseconds since epoch (Unix time)');
exports.createdAt = exports.timestamp
    .description('The time that this resource was created.');
exports.updatedAt = exports.timestamp
    .description('The time that this resource was last touched.');
exports.duration = Joi.number().integer().min(1)
    .unit('milliseconds')
    .description('The length (in millisenconds) of this resource');

exports.metaformat = Joi.string().valid('none', 'default', 'only')
    .default('default')
    .description('Set the response format with or without metadata');

exports.multiArray = function (single) {
    return Joi.alternatives(single, Joi.array().includes(single))
        .description('multiple keys or array of ' + single._description);
};

exports.summaryStatistics = Joi.object()
    .description('numerically summarizes a period of time from a panel')
    .options({
        className: 'summaryStatistics'
    });

// Taken from here: https://github.com/hapijs/joi/issues/472
exports.stream = Joi.object({
    pipe: Joi.func().required()
}).unknown().description('A file stream');

exports.fields = Joi.string()
    .description('specify a CSV list of the object keys to return');

exports.scope = Joi.array()
    .includes(Joi.string()
        .valid('basic', 'trusted', 'admin'))
    .description('The permission scope for this user');

exports.paging = function (sortOptions) {
    var sortKeys = _.map(sortOptions, function (option) {
        return _.isObject(option) ? option.key : option;
    });

    return {
        offset: Joi.number().integer().min(0)
            .description('O indexed start location within the result set.'),
        limit: Joi.number().integer().min(1)
            .description('The number of results to return'),
        sort: Joi.string().valid(sortKeys).description('Order the results by'),
        sortDirection: Joi.string().valid('asc', 'desc').default('desc')
    };
};
