"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var user = sequelize.define('user', {
        // id
        email: {type: DataTypes.STRING, unique: true},
        displayName: {type: DataTypes.STRING},
        givenName: {type: DataTypes.STRING},
        familyName: {type: DataTypes.STRING},
        preferredLayout: helpers.createJSONField(DataTypes, 'preferredLayout'),
        picture: {type: DataTypes.STRING},
        gender: {type: DataTypes.STRING},
        height: {type: DataTypes.FLOAT},
        weight: {type: DataTypes.FLOAT},
        tagline: {type: DataTypes.STRING},
        city: {type: DataTypes.STRING},
        state: {type: DataTypes.STRING},
        sport: helpers.createJSONField(DataTypes, 'preferredLayout'),
        scope: {type: DataTypes.ARRAY(DataTypes.STRING)},
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                //User.hasMany(models.Dataset, {constraints: false});
                //User.hasMany(models.Event, {constraints: false});
            }
        }

    });
    return user;
};

