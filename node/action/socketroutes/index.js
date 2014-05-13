
exports.connection = function(socket){
    
    socket.on('start', function(data, callback){
        // TODO: validate data here
        var id = generateUUID();
        callback({id:id});
        start(socket, id, data);
    });
};