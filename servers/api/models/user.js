'use strict';

var helpers = require('../support/helpers');
var nconf = require('nconf');

module.exports = function (sequelize, DataTypes) {
    var user = sequelize.define('user', {
        // id
        email: {type: DataTypes.STRING, unique: true},
        displayName: {type: DataTypes.STRING},
        givenName: {type: DataTypes.STRING},
        familyName: {type: DataTypes.STRING},
        preferredLayout: DataTypes.JSON,
        picture: {
            type: DataTypes.STRING,
            defaultValue: nconf.get('defaultUserPicture')
        },
        gender: {type: DataTypes.STRING},
        height: {type: DataTypes.FLOAT},
        weight: {type: DataTypes.FLOAT},
        tagline: {type: DataTypes.STRING},
        city: {type: DataTypes.STRING},
        state: {type: DataTypes.STRING},
        sport: DataTypes.JSON,
        scope: {
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
                user.hasMany(models.dataset, {constraints: false});
                user.hasMany(models.comment, {constraints: false});
            },
            getAssociations: function () {
                return ['dataset', 'comment'];
            },
            sortOptions: [
                'createdAt',
                'updatedAt',
                'email',
                'displayName',
                'familyName',
                'givenName',
                'state'
            ]
        }

    });
    return user;
};
