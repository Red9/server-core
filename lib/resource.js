/** Master file to provide access to resources
 *
 *
 */

var crud = require('./resource.crud.js');

var eventDescription = require('./resource.description.event');
var userDescription = require('./resource.description.user');
var commentDescription = require('./resource.description.comment');
var videoDescription = require('./resource.description.video');
var layoutDescription = require('./resource.description.layout');
var datasetDescription = require('./resource.description.dataset');

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

    result.schema = resourceDescription.schema;

    // Give resourceDescription access to other resources
    resourceDescription.resource = module.exports;

    // Add r to the list of resources
    return result;
}


exports[eventDescription.name] = addResource(eventDescription);
exports[userDescription.name] = addResource(userDescription);
exports[commentDescription.name] = addResource(commentDescription);
exports[videoDescription.name] = addResource(videoDescription);
exports[layoutDescription.name] = addResource(layoutDescription);
exports[datasetDescription.name] = addResource(datasetDescription);



