"use strict";

module.exports = function (sequelize, DataTypes) {
    var video = sequelize.define('video', {
        startTime: {type: DataTypes.DATE},
        host: {type: DataTypes.STRING},
        hostId: {type: DataTypes.STRING}
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
                video.belongsTo(models.dataset, {
                    constraints: true,
                    foreignKey: {
                        allowNull: false
                    }
                });
            }
        }
    });
    return video;
};