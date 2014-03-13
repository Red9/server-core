var underscore = require('underscore')._;

var common = requireFromRoot('support/resourcescommon');


var resources = {
    dataset: requireFromRoot('support/resources/dataset'),
    event: requireFromRoot('support/resources/event'),
    user: requireFromRoot('support/resources/user'),
    panel: requireFromRoot('support/resources/panel')
};

underscore.each(resources, function(value, key) {
    console.log('Lets do this!');
    value.create = function(newResource, callback) {
        common.createResource(value.resource, newResource, callback);
    };
    value.delete = function(id, callback) {
        common.deleteResource(value.resource, id, callback);
    };
    value.update = function(id, modifiedDataset, callback, forceEditable) {
        common.updateResource(value.resource, id, modifiedDataset, callback, forceEditable);
    };
    value.get = function(constraints, callback, expand) {
        common.getResource(value.resource, constraints, callback, expand);
    };
});

module.exports = resources;