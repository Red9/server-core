'use strict';

module.exports = function (number) {
    if (number) {
        number = number.toString();
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else {
        return number;
    }
};
