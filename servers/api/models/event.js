'use strict';

var Boom = require('boom');

var helpers = require('../support/helpers');
var panel = require('../support/panel');

var models; // Set dynamically in the associate.

function calculateStatistics(event, options, callback) {
    panel.readPanelJSON(null, event.datasetId, {
        statistics: {},
        properties: {},
        startTime: event.startTime,
        endTime: event.endTime,
        csPeriod: 10000
    }, function (err, panelResult) {
        if (err) {
            console.log(err);
        } else {
            event.summaryStatistics = panelResult.summaryStatistics;
            event.boundingBox = panelResult.boundingBox;
            event.boundingCircle = panelResult.boundingCircle;
            event.gpsLock = panelResult.gpsLock;
            event.save();
        }
        callback(err, event);
    });
}

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
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            calculateStatistics: calculateStatistics,
            associate: function (models_) {
                models = models_;

                event.belongsTo(models.dataset, {
                    constraints: true,
                    foreignKey: {
                        allowNull: false
                    }
                });
            },
            getAssociations: function () {
                return ['dataset'];
            },
            sortOptions: [
                'createdAt',
                'updatedAt',
                'startTime',
                'datasetId',
                {
                    key: 'duration',
                    orderFunction: sequelize.condition(
                        sequelize.col('endTime'),
                        '-',
                        sequelize.col('startTime'))
                },
                'type'
            ]
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
                            callback(Boom.badRequest('event startTime or ' +
                            'endTime invalid, possibly in relation to ' +
                            'dataset startTime/endTime'));
                        } else {
                            callback(null, event);
                        }
                    })
                    .catch(callback);
            },
            afterCreate: calculateStatistics
        }
    });

    return event;
};
