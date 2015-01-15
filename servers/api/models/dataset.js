"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var dataset = sequelize.define('dataset', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        endTime: helpers.createTimeField(DataTypes, 'endTime'),
        title: {type: DataTypes.STRING},
        summaryStatistics: helpers.createJSONField(DataTypes, 'summaryStatistics'),
        timezone: {type: DataTypes.STRING},
        source: helpers.createJSONField(DataTypes, 'source'),
        boundingCircle: helpers.createJSONField(DataTypes, 'boundingCircle'),
        boundingBox: helpers.createJSONField(DataTypes, 'boundingBox'),
        gpsLock: helpers.createJSONField(DataTypes, 'gpsLock'),
        tags: {type: DataTypes.ARRAY(DataTypes.STRING)},
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
            }
        }
    });

    return dataset;
};

