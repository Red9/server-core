/**
 *
 * This module is used to import FCP XML files with specific marks. I've designed
 * it to work with a FCPXML file that has the following section:
 *
 * <spine>
 <clip name="2014-07-01 09:06:36" offset="0s" duration="71623552/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r3" duration="71623552/60000s"/>
 <marker start="7490483/15000s" duration="1001/60000s" value="TestMarker.I"/>
 <marker start="15088073/30000s" duration="1001/60000s" value="bottomTurn.I"/>
 <marker start="5038033/10000s" duration="1001/60000s" value="bottomTurn.O"/>
 <marker start="30229199/60000s" duration="1001/60000s" value="carve.I"/>
 <marker start="5046041/10000s" duration="1001/60000s" value="carve.O"/>
 <marker start="30509479/60000s" duration="1001/60000s" value="pump.I"/>
 <marker start="1018017/2000s" duration="1001/60000s" value="pump.O"/>
 <marker start="6109103/12000s" duration="1001/60000s" value="bottomTurn.I"/>
 <marker start="15314299/30000s" duration="1001/60000s" value="bottomTurn.O"/>
 <marker start="30629599/60000s" duration="1001/60000s" value="snap.I"/>
 <marker start="6139133/12000s" duration="1001/60000s" value="snap.O"/>
 <marker start="3076073/6000s" duration="1001/60000s" value="bottomTurn.I"/>
 <marker start="10271261/20000s" duration="1001/60000s" value="bottomTurn.O"/>
 <marker start="15448433/30000s" duration="1001/60000s" value="cutback.I"/>
 <marker start="3884881/7500s" duration="1001/60000s" value="cutback.O"/>
 <marker start="10459449/20000s" duration="1001/60000s" value="wave.O"/>
 </clip>
 <clip name="2014-07-01 09:26:32" offset="71623552/60000s" duration="71623552/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r4" duration="71623552/60000s"/>
 <marker start="243243/1000s" duration="1001/60000s" value="test.I"/>
 <marker start="8421413/30000s" duration="1001/60000s" value="test.O"/>
 </clip>
 <clip name="2014-07-01 09:46:24" offset="143247104/60000s" duration="71623552/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r5" duration="71623552/60000s"/>
 </clip>
 <clip name="2014-07-01 10:06:20" offset="214870656/60000s" duration="71623552/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r6" duration="71623552/60000s"/>
 </clip>
 <clip name="2014-07-01 10:26:14" offset="286494208/60000s" duration="71623552/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r7" duration="71623552/60000s"/>
 </clip>
 <clip name="2014-07-01 10:46:06" offset="358117760/60000s" duration="34706672/60000s" format="r2" tcFormat="DF">
 <video offset="0s" ref="r8" duration="34706672/60000s"/>
 </clip>
 </spine>
 *
 * The design is probably pretty brittle, but it's just for Mike Olson at this point.
 *
 *
 * @param {type} $
 * @param {type} _
 * @param {type} X2JS
 * @returns {_L6.fcpxmlimportdialog}
 *
 *
 */


define(['vendor/jquery', 'vendor/underscore', 'vendor/xml2json', 'vendor/jquery.validate'], function ($, _, X2JS) {
    function fcpxmlimportdialog(sandbox, tile, configuration, doneCallback) {

        function init() {
            tile.setTitle('Import FCPXML Events');
            showForm(tile.place, configuration);
            doneCallback();
        }

        var schema = {
            showErrors: sandbox.showJqueryValidateErrors,
            submitHandler: submitHandler
        };

        /**
         *
         * @param {type} timeString An FCPXML time string, of the format '52305/60000s'.
         * @returns {Number} millisecond equivalent
         */
        function fcpTimeToMilliseconds(timeString) {
            var fraction = timeString.replace(/s+$/, '').split('/');
            if (fraction.length === 1) {
                fraction.push('1'); // Add a denominator if needed
            }

            return Math.round(parseInt(fraction[0]) / parseInt(fraction[1]) * 1000);
        }

        function setAlert(message) {
            tile.place.find('[data-name=alert]').html(message).removeClass('hidden');
        }

        function setWarning(message) {
            tile.place.find('[data-name=warning]').html(message).removeClass('hidden');
        }

        function setDone(message) {
            tile.place.find('[data-name=done]').html(message).removeClass('hidden');
        }

        function hideMessages() {
            tile.place.find('.alert').addClass('hidden');
        }

        function processXml(datasetId, xml, videoId, videoStartTime) {
            var warnings = '';
            var doneMessage = '';
            hideMessages();

            var x2js = new X2JS();

            var clips = [];
            try {
                clips = x2js.xml_str2json(xml).fcpxml.library.event.project.sequence.spine.clip;
            } catch (e) {
                setAlert('XML structure not valid. Make sure that you hav the following nesting of elements: fcpxml.library.event.project.sequence.spine.clip');
                return;
            }

            // If there is only a single clip then the x2js library parses it as an object. But we want it to always be
            // an array, so we'll convert it here.
            if (_.isArray(clips) === false) {
                clips = [clips];
            }

            var parsedEvents = _.chain(clips)
                // For each clip get all the markers, and with the correct times calculated
                .map(function (clip) {
                    var offset = fcpTimeToMilliseconds(clip._offset);

                    // If the marker is a single element then we need to convert
                    // it to an array.
                    if (typeof clip.marker === 'undefined') {
                        return [];
                    }

                    if (_.isArray(clip.marker) === false) {
                        clip.marker = [clip.marker];
                    }

                    return _.map(clip.marker, function (marker) {
                        return  {
                            time: fcpTimeToMilliseconds(marker._start) + offset,
                            type: marker._value,
                            fcpStart: marker._start

                        };
                    });
                })
                // Then put all the markers into a single array (we don't care about clips any more)
                .flatten()
                // Convert the array of ins and outs to an array of events
                .reduce(function (memo, marker) {
                    var t = marker.type.split('.');
                    var type = t[0].trim();

                    if (typeof memo.scratchPad[type] === 'undefined') {
                        memo.scratchPad[type] = {
                            type: type
                        };
                    }

                    if (t.length < 2) {
                        setWarning(warnings += 'Marker "' + marker.type + '" is not in the correct format.<br/>');
                    } else if (t[1].toUpperCase() === 'I') {
                        memo.scratchPad[type].startTime = marker.time;
                    } else if (t[1].toUpperCase() === 'O') {
                        var startTime = memo.scratchPad[type].startTime;
                        if (typeof startTime === 'undefined') {
                            setWarning(warnings += ('Bad format: missing startTime for "' + type + '" at time ' + marker.fcpStart + '<br/>'));
                        } else {
                            memo.events.push({
                                type: type,
                                startTime: startTime,
                                endTime: marker.time,
                                datasetId: datasetId
                            });
                        }
                        delete memo.scratchPad[type];
                    } else {
                        setWarning(warnings += ('Type suffix not supported: ' + marker.type + ' at time ' + marker.fcpStart + '<br/>'));
                    }
                    return memo;
                }, {events: [], scratchPad: {}})
                .value();
            // At this point if there are any open elements in the scratch pad
            // then that indicates a "malformed" input file.
            if (_.keys(parsedEvents.scratchPad).length !== 0) {
                setWarning(warnings += 'Unclosed events: ' + JSON.stringify(parsedEvents.scratchPad) + '<br/>');
            }


            var events = parsedEvents.events;
            var syncEvent = _.findWhere(events, {type: 'FCP Sync'});


            sandbox.get('event', {datasetId: datasetId, type: 'Sync'}, function (syncEventsList) {
                // If there's a new 'FCP Sync' event, and the dataset has a 'Sync' event, then we'll autosync the new
                // events and the current video to the defined event.
                if (typeof syncEvent !== 'undefined') {
                    if (syncEventsList.length === 0) {
                        setWarning(warnings += 'No Sync event in dataset for auto syncing.<br/>');
                    } else {
                        videoStartTime = syncEventsList[0].startTime - syncEvent.startTime;

                        doneMessage += 'FCP Sync used for video syncing.<br/>';

                        sandbox.update('video', videoId, {startTime: videoStartTime}, function () {
                        });
                    }
                }

                _.chain(events)
                    // Convert times from milliseconds since video start to
                    // milliseconds since epoch.
                    .map(function (event) {
                        event.startTime += videoStartTime;
                        event.endTime += videoStartTime;
                        return event;
                    })
                    .each(function (event) {
                        sandbox.create('event', event, function () {
                            console.log('created event');
                        });
                    });

                doneMessage += events.length + ' events created.';
                setDone(doneMessage);
            });
        }

        // Taken from http://stackoverflow.com/a/13709663
        function checkFileAPI() {
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                return true;
            } else {
                return false;
            }
        }

        function submitHandler(form) {
            var $form = $(form);
            var formValues = {};

            // Convert the HTML form into a key/value list.
            $form.find('input, select, textarea')
                .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                .not('[type=radio]')
                .not('[type=checkbox]')
                .each(function () {
                    var $this = $(this);
                    var key = $this.attr('name');
                    var value = $this.val();
                    formValues[key] = value;
                });
            $form.find('input[type=radio]:checked').each(function () {
                var $this = $(this);
                var key = $this.attr('name');
                var value = $this.val();
                formValues[key] = value;
            });

            var filePath = $form.find('[data-name=fileinput]')[0];

            if (filePath.files && filePath.files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var fcpxml = reader.result;
                    sandbox.get('video', {dataset: formValues.datasetId}, function (videoList) {
                        try {
                            if (videoList.length === 0) {
                                setAlert('Must define at least one video');
                            } else {
                                var video = _.min(videoList, function (video) {
                                    return video.startTime;
                                });
                                processXml(formValues.datasetId, fcpxml, video.id, video.startTime);
                            }
                        } catch (e) {

                        }
                    });
                };
                reader.readAsText(filePath.files[0]);
            }
        }


        function showForm(place, configuration) {
            sandbox.requestTemplate('embeddedvideo.fcpxmlimportdialog', function (template) {
                place.html(template({datasetId: configuration.datasetId}));

                if (checkFileAPI() === false) {
                    setAlert('You need to upgrade to a newer browser to use this feature.');
                } else {
                    place.find('form').validate(schema);
                }

            });
        }

        function destructor() {
            sandbox
                = tile
                = configuration
                = doneCallback
                = null;
        }

        init();
        return {
            destructor: destructor
        };
    }

    return fcpxmlimportdialog;
});