'use strict';

var helpers = require('../support/helpers');

var panel = require('../support/panel');
var models; // Set dynamically in the associate.

function calculateStatistics(dataset, options, callback) {
    panel.readPanelJSON(null, dataset.id, {
        properties: {},
        statistics: {}
    }, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        dataset.startTime = result.startTime;
        dataset.endTime = result.endTime;
        dataset.summaryStatistics = result.summaryStatistics;
        dataset.boundingBox = result.boundingBox;
        dataset.boundingCircle = result.boundingCircle;
        dataset.gpsLock = result.gpsLock;
        dataset.source = {
            scad: result.source
        };
        dataset.save();

        callback(null, dataset);
    });
}

module.exports = function (sequelize, DataTypes) {
    var dataset = sequelize.define('dataset', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        endTime: helpers.createTimeField(DataTypes, 'endTime'),
        title: {type: DataTypes.STRING},
        sport: {
            type: DataTypes.STRING,
            defaultValue: 'none'
        },
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
            calculateStatistics: calculateStatistics,
            associate: function (models_) {
                models = models_;
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
            },
            getAssociations: function () {
                return ['user', 'event', 'comment', 'video'];
            },
            sortOptions: {
                startTime: ['startTime', 'DESC'],
                createdAt: ['createdAt', 'DESC']
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
