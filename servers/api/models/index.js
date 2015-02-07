'use strict';

var Sequelize = require('sequelize');
var fs = require('fs');
var path = require('path');
var db = {};

module.exports = db;

db.init = function (nconf, callback) {
    var sequelize = new Sequelize(
        nconf.get('postgresql:database'), // database
        nconf.get('postgresql:username'), // username
        nconf.get('postgresql:password'), // password
        {
            host: nconf.get('postgresql:host'),
            dialect: 'postgres',
            //logging: false,
            omitNull: true
        }
    );

    fs
        .readdirSync(__dirname)
        .filter(function (file) {
            return (file.indexOf('.') !== 0) && (file !== 'index.js');
        })
        .forEach(function (file) {
            var model = sequelize.import(path.join(__dirname, file));
            db[model.name] = model;
        });

    Object.keys(db).forEach(function (modelName) {
        if ('associate' in db[modelName]) {
            db[modelName].associate(db);
        }
    });

    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    if (nconf.get('NODE_ENV') === 'test') {
        sequelize.sync({force: true});
        setTimeout(callback, 100);
    } else {
        sequelize.sync();
        callback();
    }
};
