'use strict';

/** Create a timestamp column on a table.
 *
 * @param {Object} DataTypes
 * @param {String} key - Column key.
 * @returns {Object}
 */
module.exports.createTimeField = function (DataTypes, key) {
    return {
        type: DataTypes.DATE,
        set: function (v) {
            var date = v;
            if (!(v instanceof Date)) {
                date = new Date(v);
            }
            this.setDataValue(key, date);
        },
        get: function () {
            var t = this.getDataValue(key);
            return t instanceof Date ? t.getTime() : t;
        }
    };
};

/**
 * We want all timestamps to be in milliseconds since epoch. This will
 * convert a Date object to milliseconds.
 *
 * This is just for the Sequelize createdAt and updatedAt fields.
 *
 * Taken from
 *  https://github.com/sequelize/sequelize/issues/2030#issuecomment-48571743
 *
 * @param {Object} DataTypes - Sequelize, renamed.
 * @param {String} key - Column key. Must be one of createdAt or updatedAt.
 * @returns {Object} definition - Sequelize definition made to work with Red9
 *                                  timestamps
 */
module.exports.touchTimestamp = function (DataTypes, key) {
    return {
        type: DataTypes.DATE,
        get: function () {
            return this.getDataValue(key).getTime();
        }
    };
};
