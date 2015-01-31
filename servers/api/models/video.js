'use strict';

var Boom = require('boom');

var helpers = require('../support/helpers');

var models; // Set dynamically in the associate.

module.exports = function (sequelize, DataTypes) {
    var video = sequelize.define('video', {
        startTime: helpers.createTimeField(DataTypes, 'startTime'),
        host: {type: DataTypes.STRING},
        hostId: {type: DataTypes.STRING},
        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models_) {
                models = models_;

                video.belongsTo(models.dataset, {
                    constraints: true,
                    foreignKey: {
                        allowNull: false
                    }
                });
            },
            getAssociations: function () {
                return ['video'];
            }
        },
        hooks: {
            beforeCreate: function (video, options, callback) {
                models.dataset
                    .findOne({where: {id: video.datasetId}})
                    .then(function (dataset) {
                        if (video.startTime > dataset.endTime) {
                            callback(Boom.badRequest('video startTime ' +
                            'invalid in relation to dataset ' +
                            'startTime/endTime'));
                        } else {
                            callback(null, video);
                        }
                    })
                    .catch(callback);
            }
        }
    });
    return video;
};
