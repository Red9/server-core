'use strict';

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
        tags: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: []
        },
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

                var constraints = {
                    constraints: true,
                    onDelete: 'cascade'
                };

                dataset.hasMany(models.event, constraints);
                dataset.hasMany(models.comment, constraints);
                dataset.hasMany(models.video, constraints);
            }
        },
        getterMethods: {
            duration: function () {
                return this.endTime - this.startTime;
            }
        }
    });

    return dataset;
};
