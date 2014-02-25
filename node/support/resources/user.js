var underscore = require('underscore')._;

var log = requireFromRoot('support/logger').log;
var cassandraDatabase = requireFromRoot('support/datasources/cassandra');

var common = requireFromRoot('support/resourcescommon');

var userResource = {
    id: {
        type: 'uuid',
        includeToCreate: false,
        editable: false
    },
    //--------------------------
    email: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    displayName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    givenName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    },
    familyName: {
        type: 'string',
        includeToCreate: true,
        editable: true
    }
};

function mapToCassandra(resource){
    var cassandra = {};
    
    cassandra.id = resource.id;
    cassandra.email = resource.email;
    cassandra.display_name = resource.displayName;
    cassandra.first = resource.givenName;
    cassandra.last = resource.familyName;
    
    underscore.each(cassandra, function(value, key){
        if(typeof value === 'undefined'){
            delete cassandra[key];
        }
    });
    
    return cassandra;
}

function mapToResource(cassandra){
    var resource = {};
    
    resource.id = cassandra.id;
    resource.email = cassandra.email;
    resource.displayName = cassandra.display_name;
    resource.givenName = cassandra.first;
    resource.familyName = cassandra.last;
    
    return resource;
}




exports.createUser = function(newUser, callback) {
    var valid = common.checkNewResourceAgainstSchema(userResource, newUser);
    if(typeof valid !== 'undefined'){
        callback('Schema failed: ' + valid);
        return;
    }
    
    newUser.id = common.generateUUID();
    
    var cassandraUser = mapToCassandra(newUser);
    
    cassandraDatabase.addSingle('user', cassandraUser, function(err){
       if(err){
           log.error('UserResource: Error adding. ' + err);
       } else{
           log.debug('Sucessfully created user');
           callback(undefined, [newUser]);
       }
    });
    

};

exports.deleteUser = function(parameters, callback) {

};

exports.updateUser = function(parameters, callback) {

};

exports.getUsers = function(constraints, callback) {
    // TODO(SRLM): Add check: if constraint by email use table.
    var result = [];
    cassandraDatabase.getAll('user',
            function(cassandraUser) {
                var user = mapToResource(cassandraUser);
                if (common.CheckConstraints(user, constraints) === true) {
                    result.push(user);
                } else {
                    // User failed constraints
                }
            },
            function(err) {
                callback(result);
            });
};