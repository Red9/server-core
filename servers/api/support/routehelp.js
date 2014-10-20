var stream = require('stream');
var Joi = require('joi');
var _ = require('underscore')._;

exports.createListResponse = function (findFunction) {
    return function (filters, reply) {
        var resultList = [];

        findFunction(filters, {},
            function (resource) {
                resultList.push(resource);
            },
            function (err, rowCount) {
                console.log('resultList.length: ' + resultList.length);
                reply(resultList);
            }
        );
    }
};

// Old, stream based version
// Stream based version is about 25% faster than array based version, but it
// doesn't support response validation
//exports.createListResponse = function (findFunction) {
//    return function (filters, reply) {
//        var outputStream = stream.Readable();
//        outputStream._read = function (size) {
//        };
//
//        var firstLine = true;
//        outputStream.push('[');
//        findFunction(filters, {},
//            function (resource) {
//                if (!firstLine) {
//                    outputStream.push(',');
//                } else {
//                    firstLine = false;
//                }
//                outputStream.push(JSON.stringify(resource));
//            },
//            function (err, rowCount) {
//                outputStream.push(']');
//                outputStream.push(null);
//            }
//        );
//
//        reply(outputStream);
//    }
//};

// This second regex (after the OR) is a legacy option!!! As it turns out, I haven't been using version 4
exports.idValidator = Joi.string().regex(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}|^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$$/);
exports.timestampValidator = Joi.number().integer().min(0);

/** Takes care of the messy business of going from query string query to the format required by the database.
 *
 * Query strings query are like:
 *
 * key=value
 * key.lt=value
 * key.gt=value
 *
 * @param filters
 * @param query
 * @param key
 */
exports.checkAndAddQuery = function (filters, query, keys) {
    _.each(keys, function(key) {
        if (query[key]) {
            filters[key] = query[key];
        } else if (query[key + '.lt'] || query[key + '.gt']) {
            filters[key] = {};
            if (query[key + '.lt']) {
                filters[key]['$lt'] = query[key + '.lt'];
            }
            if (query[key + '.gt']) {
                filters[key]['$gt'] = query[key + '.gt'];
            }
        }
    });
};