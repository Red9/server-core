"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var layout = sequelize.define('layout', {
        title: {type: DataTypes.STRING},
        description: {type: DataTypes.TEXT},
        for: helpers.createJSONField(DataTypes, 'for'),
        layout: helpers.createJSONField(DataTypes, 'layout')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {

            }
        }
    });
    return layout;
};