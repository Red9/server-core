'use strict';

var Boom = require('boom');
var marked = require('marked');
var helpers = require('../support/helpers');

var models; // Set dynamically in the associate.

module.exports = function (sequelize, DataTypes) {
    var comment = sequelize.define('comment', {
            startTime: helpers.createTimeField(DataTypes, 'startTime'),
            endTime: helpers.createTimeField(DataTypes, 'endTime'),
            body: {type: DataTypes.TEXT},
            createdAt: helpers.touchTimestamp(DataTypes, 'createdAt'),
            updatedAt: helpers.touchTimestamp(DataTypes, 'updatedAt')
        },
        {
            freezeTableName: true,
            classMethods: {
                associate: function (models_) {
                    models = models_;

                    comment.belongsTo(models.user, {
                        constraints: true,
                        foreignKey: {
                            allowNull: false
                        }
                    });

                    comment.belongsTo(models.dataset, {
                        constraints: true,
                        foreignKey: {
                            allowNull: false
                        },
                        onDelete: 'cascade'
                    });
                },
                getAssociations: function () {
                    return ['dataset', 'user'];
                }
            },
            getterMethods: {
                bodyHtml: function () {
                    return marked(this.body);
                }
            },
            hooks: {
                beforeCreate: function (comment, options, callback) {
                    models.dataset
                        .findOne({where: {id: comment.datasetId}})
                        .then(function (dataset) {
                            if (comment.startTime && (
                                comment.startTime < dataset.startTime ||
                                comment.startTime > dataset.endTime
                                ) ||

                                comment.endTime && (
                                comment.endTime < dataset.startTime ||
                                comment.endTime > dataset.endTime
                                ) ||

                                comment.endTime < comment.startTime
                            ) {
                                callback(Boom.badRequest('comment startTime ' +
                                'or endTime invalid, possibly in relation to ' +
                                'dataset startTime/endTime'));
                            } else {
                                callback(null, comment);
                            }
                        })
                        .catch(callback);
                }
            }
        });

    return comment;
};
