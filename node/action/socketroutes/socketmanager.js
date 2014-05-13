var io = undefined;

exports.start = function(server) {
    io = require('socket.io').listen(server);
    io.sockets.on('connection', requireFromRoot('action/socketroutes/index').connection);
};

exports.broadcastStatus = function(source, statusMessage) {
    io.sockets.emit('update', source + ': ' + statusMessage);
};