define(['vendor/jquery', 'vendor/underscore', 'socketio', 'sandbox'], function($, _, io, sandbox) {

    function actionView(myPlace, configuration, doneCallback) {
        sandbox.requestTemplate('actionview', function(template) {
            myPlace.html(template({}));
        });
        
        var socket = io.connect('action.localdev.redninesensor.com');
        socket.on('connect', function(){
            console.log('Connected!');
            
            socket.emit('start', {}, function(result){
               socket.on(result.id, function(i){
                   console.log('Got i: ' + i);
               });
            });
        });
        
        
        
        //-------------------------------
        // TODO: don't we need to call doneCallback? It looks like I left this half done...
        //-------------------------------
        
        
        //    myPlace.find('.processing_notes').append('<p class="processing_note">Line</p>');
        

    }



    return actionView;
});
