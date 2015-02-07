'use strict';

var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var layout = sequelize.define('layout', {
        title: {type: DataTypes.STRING},
        description: {type: DataTypes.TEXT},
        for: DataTypes.JSON,
        layout: DataTypes.JSON,

        createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
        updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
    }, {
        freezeTableName: true,
        classMethods: {
            associate: function (models) {
            },
            getAssociations: function () {
                return [];
            },
            sortOptions: {}
        }
    });
    return layout;
};
