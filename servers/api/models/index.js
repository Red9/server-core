"use strict";

var Sequelize = require('sequelize');
var fs = require("fs");
var path = require("path");
var db = {};

var sequelize = new Sequelize(
    'development', // database
    'development', // username
    'development', // password
    {
        host: 'localhost',
        dialect: 'postgres',
        omitNull: true
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
sequelize.sync({force: true});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
console.log('Loaded models...');
