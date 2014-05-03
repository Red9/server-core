/** Class to manage the lifecycle of a single tile.
 * 
 */

define(['vendor/jquery', 'vendor/underscore'], function($, _) {
    function tileFrame(sandbox, id, homeDiv, frameType,
            tileClass, tileConfiguration, createdCallback) {

        var place, titlePlace, tilePlace, barPlace;

        sandbox.requestTemplate('tileframe.' + frameType, function(template) {
            place = $(template({}));
            homeDiv.append(place);

            titlePlace = place.find('[data-name=rowtitle]');
            barPlace = place.find('[data-name=buttonbar]');
            tilePlace = place.find('[data-name=tileplace]');

            place.find('[data-name=togglevisible]').on('click', function() {
                // Not always there (modals...), but if it is we'll respond.
                $(this).find('span').toggleClass('glyphicon-resize-small glyphicon-resize-full');
                tilePlace.toggle('fast');
            });

            if (frameType === 'modal') {
                place.filter('.modal').on('hidden.bs.modal', function(e) {
                    destructor(true); 
                }).modal('show');


            }

            var tileDefinition = {
                setTitle: setTitle,
                addToBar: addToBar,
                destructor: destructor,
                addListener: addListener,
                place: tilePlace
            };

            var tileResult;

            if (typeof tileConfiguration === 'undefined') {
                tileConfiguration = {};
            }

            require(['tiles/' + tileClass], function(tileConstructor) {
                // There may be a bug here: what if the class does it's
                // configuration and calls doneCallback() before
                // it can be pushed into modules?
                // Update: before it can be assigned?

                tileResult = tileConstructor(sandbox, tileDefinition, tileConfiguration, function() {
                    createdCallback();
                });
            });


        });


        return {
            destructor: destructor
        };


        function addToBar(name, custom, iconName, listener) {
            barPlace.append('<a class="btn btn-link btn-lg" data-name="'
                    + name + '" ' + custom + ' >'
                    + '<span class="glyphicon ' + iconName + '"></span></a>');
            barPlace.find('[data-name=' + name + ']').on('click', listener);
        }

        function setTitle(newTitle) {
            titlePlace.html(newTitle);
        }

        function addListener(event, listener) {
            $(sandbox).on(event + '.' + id, listener);
        }

        function destructor(alreadyHidden) {
            console.log('Calling destructor...');
            $(sandbox).off('.' + id);
            if (frameType === 'modal' && alreadyHidden !== true) {
                place.filter('.modal').on('hidden.bs.modal', function() {
                    place.remove();
                }).modal('hide'); // If modal, will hide it.
            } else {
                place.remove();
            }
        }
    }

    return tileFrame;
});