"use strict";

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var event = sequelize.define('event', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        endTime: helpers.createTimeField(DataTypes, 'endTime'),
        type: {type: DataTypes.STRING},
        subType: {type: DataTypes.STRING},
        summaryStatistics: helpers.createJSONField(DataTypes, 'summaryStatistics'),
        source: helpers.createJSONField(DataTypes, 'source'),
        boundingCircle: helpers.createJSONField(DataTypes, 'boundingCircle'),
        boundingBox: helpers.createJSONField(DataTypes, 'boundingBox'),
        gpsLock: helpers.createJSONField(DataTypes, 'gpsLock'),
        // TODO: ordinalRank
        cardinalRank: {type: DataTypes.INTEGER},
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                event.belongsTo(models.dataset, {
                    constraints: true,
                    //foreignKeyConstraint:true,
                    foreignKey: {
                        allowNull: false
                    }
                });
            }
        },
        getterMethods: {
            duration: function () {
                return this.endTime - this.startTime;
            }
        }
    });

    return event;
};