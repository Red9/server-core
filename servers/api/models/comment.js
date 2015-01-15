"use strict";

var markdown = require('markdown').markdown;

module.exports = function (sequelize, DataTypes) {
    var comment = sequelize.define('comment', {
            startTime: {type: DataTypes.DATE},
            endTime: {type: DataTypes.DATE},
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