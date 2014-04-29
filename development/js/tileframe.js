/** Class to manage the lifecycle of a single tile.
 * 
 */

define(['vendor/jquery', 'vendor/underscore'], function($, _) {
    function tileFrame(sandbox, tile, tileTemplate, createdCallback) {


        function addToBar(name, custom, iconName, listener) {
            barPlace.append('<a class="btn btn-link btn-lg" data-name="'
                    + name + '" ' + custom + ' >'
                    + '<span class="glyphicon ' + iconName + '"></span></a>');
            barPlace.find('[data-name=' + name + ']').on('click', listener);
        }


        function destructor() {

        }

        function setTitle(newTitle) {
            titlePlace.html(newTitle);
        }

        function addListener(event, listener) {
            $(sandbox).on(event, listener);
        }


        var place = $(tileTemplate({}));
        sandbox.div.append(place);

        var titlePlace = place.find('[data-name=rowtitle]');
        var barPlace = place.find('[data-name=buttonbar]');
        var tilePlace = place.find('[data-name=tileplace]');

        place.find('[data-name=togglevisible]').on('click', function() {
            console.log('Clicked!');
            $(this).find('span').toggleClass('glyphicon-resize-small glyphicon-resize-full');
            tilePlace.toggle('fast');
        });


        var tileDefinition = {
            setTitle: setTitle,
            addToBar: addToBar,
            destructor: destructor,
            addListener: addListener,
            place: tilePlace
        };

        var tileResult;

        if (typeof tile.configuration === 'undefined') {
            tile.configuration = {};
        }

        require(['tiles/' + tile.class], function(tileClass) {
            // There may be a bug here: what if the class does it's
            // configuration and calls doneCallback() before
            // it can be pushed into modules?
            // Update: before it can be assigned?

            tileResult = tileClass(sandbox, tileDefinition, tile.configuration, function() {
                createdCallback();
            });
        });

        return {
            destructor: destructor
        };
    }

    return tileFrame;
});