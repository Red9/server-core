"use strict";

var Sequelize = require('sequelize');
var fs = require("fs");
var path = require("path");
var db = {};

module.exports = db;

db.init = function (nconf) {
    var sequelize = new Sequelize(
        nconf.get('postgresql:database'), // database
        nconf.get('postgresql:username'), // username
        nconf.get('postgresql:password'), // password
        {
            host: nconf.get('postgresql:host'),
            dialect: 'postgres',
            omitNull: true,
            logging: false
        }
    );

    fs
        .readdirSync(__dirname)
        .filter(function (file) {
            return (file.indexOf(".") !== 0) && (file !== "index.js");
        })
        .forEach(function (file) {
            var model = sequelize["import"](path.join(__dirname, file));
            console.log('Creating model ' + model.name);
            db[model.name] = model;
        });

    Object.keys(db).forEach(function (modelName) {
        if ("associate" in db[modelName]) {
            db[modelName].associate(db);
        }
    });

    console.log('WARNING!!! REMOVE OR CHECK sync FUNCTION BEFORE PRODUCTION');
    //sequelize.sync({force: true});
    sequelize.sync();

    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    console.log('Loaded models...');
};
