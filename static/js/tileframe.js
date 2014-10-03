/** Class to manage the lifecycle of a single tile.
 * 
 */

define(['vendor/jquery', 'vendor/underscore'], function($, _) {
    function tileFrame(sandbox, id, homeDiv, frameType,
            tileClass, tileConfiguration, createdCallback) {

        var place, titlePlace, tilePlace, barPlace;
        var tileResult;

        sandbox.requestTemplate('tileframe.' + frameType, function(template) {
            place = $(template({}));
            homeDiv.append(place);

            titlePlace = place.find('[data-name=rowtitle]');
            barPlace = place.find('[data-name=buttonbar]');
            tilePlace = place.find('[data-name=tileplace]');

            place.find('[data-name=togglevisible]').on('click', toggleVisible);

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
                setVisible: setVisible,
                place: tilePlace
            };



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

        function setVisible(newState) {
            if (tilePlace.is(':visible') !== newState) {
                toggleVisible();
            }
        }

        function toggleVisible() {
            // Not always there (modals...), but if it is we'll respond.
            place.find('[data-name=togglevisible]').find('span').toggleClass('glyphicon-resize-small glyphicon-resize-full');
            tilePlace.toggle('fast');
        }


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

        function destructor() {
            if (typeof sandbox === 'undefined') {
                // Use sandbox as a proxy for determining if destruction
                // has already occurred.
                return;
            }
            console.log('tileframe Destructor');

            tileResult.destructor();

            $(sandbox).off('.' + id);
            place.filter('.modal').modal('hide'); // If modal, will hide it.
            place.unbind();
            place.empty();
            place.remove();

            sandbox
                    = id
                    = homeDiv
                    = frameType
                    = tileClass
                    = tileConfiguration
                    = createdCallback
                    = tileResult
                    = place
                    = titlePlace
                    = tilePlace
                    = barPlace
                    = undefined;
        }
    }

    return tileFrame;
});