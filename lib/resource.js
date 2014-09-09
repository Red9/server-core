/** Master file to provide access to resources
 *
 *
 */

var crud = require('./resource.crud.js');

var eventDescription = require('./resource.description.event.js');


function addResource(resourceDescription) {
    var result = {};

    result.create = function (newEvent, callback) {
        crud.create(resourceDescription, newEvent, callback);
    };

    /**
     *
     * @param query
     * @param options
     * @param rowCallback
     * @param callback (err, totalRows)
     */
    result.find = function (query, options, rowCallback, callback) {
        crud.find(resourceDescription, query, options, rowCallback, callback);
    };

    /**
     *
     * @param id
     * @param updatedEvent can be entire event (non-editable keys will be ignored). Must have at least one editable key
     * @param callback {function} (err)
     */

    result.update = function (id, updatedEvent, callback) {
        crud.update(result.find, resourceDescription, id, updatedEvent, callback);
    };

    /** DELETE from database
     *
     * @param id
     * @param callback {function} (err, deletedResource)
     */
    result.delete = function (id, callback) {
        crud.delete(result.find, resourceDescription, id, callback);
    };

    // Give r access to other resources
    resourceDescription.resource = module.exports;

    // Add r to the list of resources
    return result;
}


exports[eventDescription.name] = addResource(eventDescription);



