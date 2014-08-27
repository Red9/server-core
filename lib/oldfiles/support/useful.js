var underscore = require('underscore')._;

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

/** Takes a stream of text (in chunks) and calls a line callback every time it
 * has read a full line.
 * 
 * @param {type} lineCallback a function called when a complete line is ready.
 * @returns {Function} a function to call with the incremental updates.
 */
exports.createStreamToLine = function(lineCallback) {
    var updateBuffer = '';
    return function(something) {
        updateBuffer += something;

        if (updateBuffer.split('\n').length > 1) {
            var t = updateBuffer.split('\n');
            updateBuffer = t[t.length - 1]; // Keep last bit in case it's not an entire line.

            for (var i = 0; i < t.length - 1; i++) {
                lineCallback(t[i]);
            }
        }
    };
};



function extractValue(partPath, resource) {
    if (typeof resource === 'undefined') {
        return; // undefined;
    }
    if (partPath.length === 1) {
        return resource[partPath[0]];
    } else {
        return extractValue(partPath.slice(1), resource[partPath[0]]);
    }
}

function setValue(memo, partPath, value) {
    if (partPath.length === 1) {
        memo[partPath[0]] = value;
    } else {
        if (typeof memo[partPath[0]] === 'undefined') {
            memo[partPath[0]] = {};
        }
        setValue(memo[partPath[0]], partPath.slice(1), value);
    }
}

function reduceResource(resource, parts) {
    var t = underscore.reduce(parts, function(memo, partPath) {
        var value = extractValue(partPath, resource);
        setValue(memo, partPath,
                value
                );
        return memo;
    }, {});

    return t;
}

function parseParts(partsString) {
    return underscore.chain(partsString.split(','))
            .map(function(part) {
                return part.split('.');
            })
            .sortBy(function(part) {
                // Sort in descending order
                return -part.length;
            })
            .value();
}

/** Handles cutting down a resource array to just the parts that we want.
 * 
 * Supports using key.key.key (dot notation) for nested keys.
 * 
 * @param {type} req the client request. Expects a part parameter.
 * @returns {Function} that processes the resultList into a parts-ified result
 */
exports.prepareParts = function(req) {
    var partsString;
    if (typeof req.query['part'] !== 'undefined') {
        partsString = req.query['part'];
        delete req.query['part'];
    }

    return function(resourceList) {
        if (typeof partsString !== 'undefined') {
            var parts = parseParts(partsString);
            if (parts.length !== 0) {
                resourceList =
                        underscore.chain(resourceList)
                        .map(function(resource) {
                            return reduceResource(resource, parts);
                        })
                        .reject(function(resource) {
                            return underscore.isEmpty(resource);
                        })
                        .value();
            }
        }
        return resourceList;
    };
};