"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var dataset = sequelize.define('dataset', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        endTime: helpers.createTimeField(DataTypes, 'endTime'),
        title: {type: DataTypes.STRING},
        summaryStatistics: DataTypes.JSON,
        timezone: {type: DataTypes.STRING},
        source: DataTypes.JSON,
        boundingCircle: DataTypes.JSON,
        boundingBox: DataTypes.JSON,
        gpsLock: DataTypes.JSON,
        tags: {type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: []},
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                dataset.belongsTo(models.user, {
                    constraints: true,
                    foreignKey: {
                        allowNull: false
                    }
                });
                dataset.hasMany(models.event, {constraints: true});
                dataset.hasMany(models.comment, {constraints: true});
                dataset.hasMany(models.video, {constraints: true});
            }
        }
    });

    return dataset;
};

