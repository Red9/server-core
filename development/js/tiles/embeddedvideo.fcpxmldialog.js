define(['vendor/jquery', 'vendor/underscore', 'vendor/jquery.validate'], function($, _) {
    function fcpxmldialog(sandbox, tile, configuration, doneCallback) {

        var videoTypes = {
            '720p_59.94hz_H.264': {
                name: '720p   59.94Hz   H.264',
                selected: 'selected',
                numerator: 1001,
                denominator: 60000,
                framesPerVideo: 71623552,
                pixels: {
                    width: 1280,
                    height: 720
                }
            }
        };

        var schema = {
            showErrors: sandbox.showJqueryValidateErrors,
            submitHandler: submitHandler
        };

        function init() {
            tile.setTitle('Download FCPXML File');
            showForm(tile.place, configuration);
            doneCallback();
        }

        function outputFCPXML(formValues, fcpxmlTemplate, eventList, video, dataset) {
            var framesPerVideo = videoTypes[formValues.videoType].framesPerVideo;
            var numerator = videoTypes[formValues.videoType].numerator;
            var denominator = videoTypes[formValues.videoType].denominator;
            var pixels = videoTypes[formValues.videoType].pixels;

            // Frames are on the 1001 boundary, so make sure that we're there.
            function frameCorrected(value) {
                return Math.floor(value / numerator) * numerator;
            }

            var assets = _.map(formValues.files, function(filename, index) {
                return {
                    ref: 'r' + (index + 2),
                    source: filename.replace(/ /g, '%20'),
                    start: index * framesPerVideo,
                    duration: framesPerVideo
                };
            });

            // Reverse so that the matching of clip to video uses the video that
            // is "rightmost"
            assets.reverse();

            var runningOffset = 0;
            var clips =
                    _.chain(eventList)
                    .sortBy(function(event) {
                        return event.startTime;
                    })
                    .map(function(event) {
                        var durationFrames = frameCorrected((event.endTime - event.startTime) / 1000 * denominator);
                        var startFramesTotal = frameCorrected((event.startTime - video.startTime) / 1000 * denominator);

                        // Find the asset. The list must be reversed for this
                        // to work correctly.
                        var asset = _.find(assets, function(asset) {
                            return asset.start <= startFramesTotal;
                        });

                        var result = {
                            name: event.type + ' ' + event.id,
                            offsetFrames: runningOffset,
                            durationFrames: durationFrames,
                            startFrames: startFramesTotal - asset.start,
                            video: asset,
                            denominator: denominator
                        };
                        runningOffset += durationFrames;
                        return result;
                    })
                    .value();

            assets.reverse(); // Mostly for aesthetic reasons in the result.

            var parameters = {
                asset: assets,
                clip: clips,
                datasetName: dataset.title,
                sequenceName: formValues.type + ' highlight reel',
                numerator: numerator,
                denominator: denominator,
                pixels: pixels
            };

            window.open('data:text/xml,' + encodeURIComponent(fcpxmlTemplate(parameters)));
            tile.destructor();
        }

        function submitHandler(form) {
            var $form = $(form);
            var formValues = {};

            // Convert the HTML form into a key/value list.
            $form.find('input, select, textarea')
                    .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                    .each(function() {
                        var $this = $(this);
                        var key = $this.attr('name');
                        var value = $this.val();
                        formValues[key] = value;
                    });


            // Extract the filenames into an array.
            formValues.files = [];
            for (var i = 0; ; i++) {
                var key = "file" + i;
                var value = formValues[key];
                if (typeof value === 'undefined') {
                    // Not included in the form.
                    break;
                } else if (value === '') {
                    // Default of empty string
                } else {
                    // Video path
                    formValues.files.push(value);
                }
                delete formValues[key];
            }
            sandbox.requestTemplate('fcpxml', function(fcpxmlTemplate) {
                sandbox.get('dataset', {id: formValues.datasetId}, function(datasetList) {
                    sandbox.get('event',
                            {
                                datasetId: formValues.datasetId,
                                type: formValues.type
                            }, function(eventList) {
                        sandbox.get('video', {dataset: formValues.datasetId}, function(videoList) {
                            // In case we have multiple associated videos: use the
                            // first in time as our base truth.
                            videoList = _.sortBy(videoList, function(video) {
                                return video.startTime;
                            });
                            outputFCPXML(formValues, fcpxmlTemplate, eventList, videoList[0], datasetList[0]);
                        });
                    });
                });
            });
        }

        function showForm(place, configuration) {
            sandbox.requestTemplate('embeddedvideo.fcpxmldialog', function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {
                    _.each(eventTypes, function(type) {
                        if (type.name === 'Wave') {
                            type.selected = 'selected';
                        } else {
                            type.selected = '';
                        }
                    });

                    var parameters = {
                        eventTypes: eventTypes,
                        videoType: videoTypes,
                        datasetId: configuration.datasetId
                    };
                    place.html(template(parameters));
                    place.find('form').validate(schema);
                });


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
    return fcpxmldialog;
});