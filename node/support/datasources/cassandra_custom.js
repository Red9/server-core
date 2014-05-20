var cassandraDatabase = requireFromRoot('support/datasources/cassandra');

exports.getEventsByDataset = function(datasetId, callbackItem, callbackDone) {
    var command = 'SELECT * FROM event WHERE dataset=?';
    var parameters = [
        {
            value: datasetId,
            hint: 'uuid'
        }
    ];

    cassandraDatabase.rawGetAll(command, parameters, 'event', callbackItem,
            callbackDone);
};