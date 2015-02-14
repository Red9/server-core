'use strict';

if (typeof process.env.NODE_ENV === 'undefined') {
    throw new Error('Must provide a NODE_ENV');
}

var nconf = require('nconf');
nconf
    .argv()
    .env()
    .file('general', {file: '../config/general.json'})
    .file('deployment', {file: '../config/' + process.env.NODE_ENV + '.json'})
    .file('common', {file: '../../config/' + process.env.NODE_ENV + '.json'});

/**
 *  Recalculate all summary statistics across the entire database.
 *  It may take a while.
 *
 *
 *
 *
 */

var models = require('../models');
var async = require('async');

var maxParallel = 4;

function runAll(type) {
    var completed = 0;
    return function (callback) {
        models[type]
            .findAll({})
            .then(function (list) {
                async.eachLimit(list, maxParallel,
                    function (resource, cb) {
                        models[type].
                            calculateStatistics(resource, null, function (err) {
                                completed++;
                                console.log(type + ': ' + completed + '/' +
                                list.length);
                                cb(err);
                            });
                    },
                    function (err) {
                        callback(err);
                    });
            })
            .catch(function (err) {
                console.log('Error getting all ' + type + 's: ' + err);
                console.log(err);
                process.exit(1);
            });
    };
}

models.init(nconf, function () {
    async.series([
        runAll('dataset'),
        runAll('event')
    ], function (err) {
        console.log('All done.');
        if (err) {
            console.log(err);
            process.exit(1);
        } else {
            process.exit(0);
        }
    });
});
