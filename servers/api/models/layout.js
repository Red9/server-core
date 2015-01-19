"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var layout = sequelize.define('layout', {
        title: {type: DataTypes.STRING},
        description: {type: DataTypes.TEXT},
        for: DataTypes.JSON,
        layout: DataTypes.JSON
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
            }
        }
    });
    return layout;
};