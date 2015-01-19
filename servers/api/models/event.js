"use strict";

var Boom = require('boom');

var helpers = require('../support/helpers');
var panel = require('../support/panel');

var models; // Set dynamically in the associate.

module.exports = function (sequelize, DataTypes) {
    var event = sequelize.define('event', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        endTime: helpers.createTimeField(DataTypes, 'endTime'),
        type: {type: DataTypes.STRING},
        subType: {type: DataTypes.STRING},
        summaryStatistics: DataTypes.JSON,
        source: DataTypes.JSON,
        boundingCircle: DataTypes.JSON,
        boundingBox: DataTypes.JSON,
        gpsLock: DataTypes.JSON,
        // TODO: ordinalRank
        cardinalRank: {type: DataTypes.INTEGER},
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models_) {
                models = models_;

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
        },
        hooks: {
            beforeCreate: function (event, options, callback) {
                models.dataset
                    .findOne({where: {id: event.datasetId}})
                    .then(function (dataset) {
                        if (event.startTime < dataset.startTime ||
                            event.endTime < dataset.startTime ||
                            event.startTime > dataset.endTime ||
                            event.endTime > dataset.endTime ||
                            event.endTime <= event.startTime) {
                            callback(Boom.badRequest('event startTime or endTime invalid, possibly in relation to dataset startTime/endTime'));
                        } else {
                            callback(null, event);
                        }
                    })
                    .catch(callback);
            },
            afterCreate: function (event, options, callback) {
                panel.readPanelJSON(null, event.datasetId, {
                    statistics: {},
                    properties: {},
                    startTime: event.startTime,
                    endTime: event.endTime,
                    csPeriod: 10000
                }, function (err, panelResult) {
                    event.summaryStatistics = panelResult.summaryStatistics;
                    event.boundingBox = panelResult.boundingBox;
                    event.boundingCircle = panelResult.boundingCircle;
                    event.gpsLock = panelResult.gpsLock;
                    event.save();
                    callback(err, event);
                });
            }
        }

    });

    return event;
};