/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
exports.generateUUID = function() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return (_p8() + _p8(true) + _p8(true) + _p8());
};

// Returns a random integer between min and max
// Using Math.round() will give you a non-uniform distribution!
// Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
exports.generateInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};