"use strict";


module.exports.createJSONField = function (DataTypes, key) {
    return {
        type: DataTypes.TEXT,
        set: function (v) {
            this.setDataValue(key, JSON.stringify(v));
        },
        get: function () {
            return JSON.parse(this.getDataValue(key));
        }
    };
};

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
 *
 * We want all timestamps to be in milliseconds since epoch. This will
 * convert a Date object to milliseconds.
 *
 * Taken from https://github.com/sequelize/sequelize/issues/2030#issuecomment-48571743
 *
 * @param DataTypes
 * @param key
 * @returns definition
 */
module.exports.touchTimestamp = function (DataTypes, key) {
    return {
        type: DataTypes.DATE,
        get: function () {
            return this.getDataValue(key).getTime();
        }
    };
};