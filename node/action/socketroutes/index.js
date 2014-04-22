//'use strict';

/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
var generateUUID = function() {
    function _p8(s) {
        var p = (Math.random().toString(16) + "000000000").substr(2, 8);
        return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
    }
    return (_p8() + _p8(true) + _p8(true) + _p8());
};

function start(socket, id, data){
    var i = 0;
    
    var myInterval = setInterval(function(){
        socket.emit(id, i);
        i++;
        
        if(i > 100){
            clearInterval(myInterval);
        }
    }, 1000);
};

exports.connection = function(socket){
    
    socket.on('start', function(data, callback){
        // TODO: validate data here
        var id = generateUUID();
        callback({id:id});
        start(socket, id, data);
    });
};