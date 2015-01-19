"use strict";

var markdown = require('markdown').markdown;
var helpers = require('../support/helpers');

module.exports = function (sequelize, DataTypes) {
    var comment = sequelize.define('comment', {
            startTime: helpers.createTimeField(DataTypes, 'startTime'),
            endTime: helpers.createTimeField(DataTypes, 'endTime'),
            body: {type: DataTypes.TEXT}
        },
        {
            freezeTableName: true,
            classMethods: {
                associate: function (models) {
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
                        }
                    });
                }
            },
            getterMethods: {
                bodyHtml: function () {
                    return markdown.toHTML(this.body);
                }
            }
        });

    return comment;
};