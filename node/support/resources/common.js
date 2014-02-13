var underscore = require('underscore')._;
var validator = require('validator');
var moment = require('moment');

/**
 * 
 * Constraints are a list of things that fit:
 *  {
 *      path.to.key:[value],
 *      path.to.key2:[value2]
 *  }
 *  
 *  OR
 *  
 *  {
 *      path.to.key:"value,value,value",
 *      path.to.key2: "value"
 *  }
 *  
 *  Note that the path can include .less or .more postfixes. The array of values
 *  are what are compared against. If any of them fail then the entire comparison
 *  fails.
 *  
 * // Compares number to number, if available.
 * // Case insensitive for string comparisons
 * @param {type} object
 * @param {type} constraints
 * @returns {boolean} true if it fits constraints, false otherwise
 */
exports.CheckConstraints = function(object, constraints) {

    var result = true; // Default to true for no constraints.
    underscore.each(constraints, function(constraintValues, constraintPath) {
        if (underscore.isString(constraintValues) === true) {
            constraintValues = constraintValues.split(',');
        }
        var path = constraintPath.split('.');


        var comparison = 'equal';
        if (path[path.length - 1] === 'less' || path[path.length - 1] === 'more') {
            comparison = path.pop();
        }
        var objectValue = GetValueFromPath(object, path);

        if (underscore.isString(objectValue) === false
                && underscore.isNumber(objectValue) === false) {
            // Can't compare to complex objects.
            result = false;
        } else {
            underscore.each(constraintValues, function(constraintValue) {
                if (comparison === 'less' || comparison === 'more') {
                    // If it's not a number but could be convert it.
                    if (underscore.isNumber(constraintValue) === false
                            && validator.isFloat(constraintValue)) {
                        constraintValue = parseFloat(constraintValue);
                    }

                    if (underscore.isString(objectValue)
                            || underscore.isString(constraintValue)) {
                        result = false; // Can't compare less/more with strings...
                    } else if (comparison === 'less' && objectValue > constraintValue) {
                        result = false;
                    } else if (comparison === 'more' && objectValue < constraintValue) {
                        result = false;
                    }

                } else { // equal
                    // If they're not equal (both directly or as strings)
                    if (!(constraintValue === objectValue
                            || constraintValue.toString().toUpperCase()
                            === objectValue.toString().toUpperCase())) {
                        result = false;
                    }
                }
            });
        }
    });

    return result;
};

/** Given an array of keys will drill down and get the value from following all
 * those keys.
 * 
 * Low level function.
 *
 * @param {Object} source a JSON object, possibly multiple levels
 * @param {Array} path 
 * @returns {something or undefined} The value at that path.
 */
function GetValueFromPathAndRecurse(source, path) {
    var key = path.shift();
    if (path.length === 0) {
        return source[key];
    } else if (typeof source[key] === 'undefined') {
        return;
    } else {
        return GetValueFromPathAndRecurse(source[key], path);
    }
}

/**
 * 
 * @param {type} source
 * @param {Array} path
 * @returns {unresolved|somethingorundefined}
 */
function GetValueFromPath(source, path) {
    // Check the paramater types
    if (underscore.isArray(path) === true
            || path.length > 0
            || underscore.isObject(source) === true) {

        var result = GetValueFromPathAndRecurse(source, path);
        if (underscore.isObject(result) === true
                || underscore.isArray(result) === true) {
            return;
        } else {
            return result;
        }
    } else { // Parameter types invalid
        return;
    }
}


/**
 * 
 * @param {type} value
 * @param {type} type
 * @returns {Boolean} True if value matches type
 */
exports.checkType = function(value, type) {
    if (type === 'timestamp') {
        return moment(value).isValid();
    } else if (type === 'string' || type === 'varchar') {
        return underscore.isString(value);
    } else if (type === 'uuid') {
        return validator.isUUID(value);
    } else if (type === 'resource:summary_statistics') {
        //TODO(SRLM): Make this more robust
        return underscore.isObject(value);
    } else if (type === 'integer') {
        return underscore.isNumber(value)
                && validator.isInt(value.toString());
    } else if (type === 'float') {
        return underscore.isNumber(value);
    } else {
        return false;
    }
};

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
}



exports.checkNewResourceAgainstSchema = function(resourceSchema, proposedResource){
    // Check if we have the correct set of keys
    var correctKeys = true;
    underscore.each(resourceSchema, function(value, key) {
        correctKeys = correctKeys && (key in proposedResource) === value.includeToCreate;
    });
    
    if (correctKeys === false) {
        return "Incorrect keys given.";
    }
    
    // Check for the correct value types
    var correctTypes = true;
    underscore.each(proposedResource, function(value, key) {
        correctTypes = correctTypes && exports.checkType(value, resourceSchema[key].type);
    });
    if (correctTypes === false) {
        return "Incorrect types given";
    }
};