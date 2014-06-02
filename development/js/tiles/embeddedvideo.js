define(['vendor/jquery', 'vendor/underscore', 'vendor/async', 'customHandlebarsHelpers'], function($, _, async, chh) {
    // Class variables
    var youtubeApiKey = "AIzaSyBhSTRxw9EXWgZiMCqIYdPKtZuDdaXkCdA";
    var kPlayerUpdateInterval = 100;

    function embeddedVideo(sandbox, tile, configuration, doneCallback) {

        var videoList;
        var playerTimePlace;
        var currentVideoIndex;
        var player;
        var showPlayerTimeTimeout;
        var datasetId;
        var $videoSyncCheckbox;
        var $videoEmitEventCheckbox;
        var $videoSpeedSelect;
        var $videoLoopOnViewCheckbox;
        var $videoNextEventCheckbox;
        var $videoNextEventSelect;

        function init() {
            reset();
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-hover-time', hoverTime);
            setVideos(videoList); // Initial set to empty list.
            tile.setTitle('videos');
            doneCallback();
        }

        function reset() {
            videoList = [];

            currentVideoIndex = -1;
            player
                    = playerTimePlace
                    = datasetId
                    = $videoSyncCheckbox
                    = $videoEmitEventCheckbox
                    = $videoSpeedSelect
                    = $videoLoopOnViewCheckbox
                    = $videoNextEventCheckbox
                    = $videoNextEventSelect
                    = undefined;

            if (typeof showPlayerTimeTimeout !== 'undefined') {
                clearInterval(showPlayerTimeTimeout);
                showPlayerTimeTimeout = undefined;
            }

        }

        function annotateVideoWithHostInformation(video, callback) {
            // Get the YouTube video information.
            $.ajax({
                type: 'GET',
                url: "https://www.googleapis.com/youtube/v3/videos?id="
                        + video.hostId +
                        "&part=snippet,contentDetails,recordingDetails&key=" + youtubeApiKey,
                dataType: 'json',
                xhrFields: {
                    withCredentials: false
                },
                success: function(data) {


                    // YouTube duration is in the format "PT13M34S"
                    // Let's convert it to our standard milliseconds
                    var videoDuration = data.items[0].contentDetails.duration.match(/[0-9]+/g);
                    videoDuration = (parseInt(videoDuration[0]) * 60 + parseInt(videoDuration[1])) * 1000;

                    video.title = data.items[0].snippet.title;
                    video.description = sandbox.truncateStringAtWord(data.items[0].snippet.description, 45);
                    video.thumbnails = data.items[0].snippet.thumbnails;
                    video.duration = videoDuration;

                    // Create an artificial end time.
                    video.endTime = video.startTime + video.duration;

                    callback(null, video);
                },
                error: function() {
                    callback(null, video);
                }

            });
        }

        function onPlayerStateChange(event) {
            if (event.data === YT.PlayerState.PLAYING) {
                if (typeof showPlayerTimeTimeout === 'undefined') {
                    showPlayerTimeTimeout = setInterval(showPlayerTime, kPlayerUpdateInterval);
                }
            } else if (event.data === YT.PlayerState.ENDED
                    || event.data === YT.PlayerState.PAUSED
                    || event.data === YT.PlayerState.BUFFERING) {
                if (typeof showPlayerTimeTimeout !== 'undefined') {
                    clearInterval(showPlayerTimeTimeout);
                    showPlayerTimeTimeout = undefined;
                }
            }
        }

        function endOfFocusReached() {
            if ($videoLoopOnViewCheckbox.prop('checked')) {
                seekTo(sandbox.focusState.startTime);
            } else if ($videoNextEventCheckbox.prop('checked')) {
                console.log('seek to next event');
                player.pauseVideo();
                sandbox.get('event', {datasetId: sandbox.getCurrentDataset()}, function(eventList) {
                    var eventType = $videoNextEventSelect.find('option:selected').val();
                    var nextEvent = _.find(_.sortBy(_.filter(eventList, function(event) {
                        return event.type === eventType; // Limit to the selected event type
                    }), function(event) {
                        return event.startTime;         // Sort by start time
                    }), function(event) {
                        return event.startTime >= sandbox.focusState.endTime;
                    });

                    if (typeof nextEvent !== 'undefined') {
                        sandbox.initiateResourceFocusedEvent('event', nextEvent.id);
                        player.playVideo();
                    }
                });
            }
        }

        function showPlayerTime() {
            if (typeof playerTimePlace === 'undefined') {
                playerTimePlace = tile.place.find('[data-name=currentvideotime]');
            }

            var playerTime = videoList[currentVideoIndex].startTime + player.getCurrentTime() * 1000;
            //console.log('Player Time: ' + playerTime);
            playerTimePlace.text(chh.millisecondsEpochToTime(playerTime) + ' (' + playerTime + ')');
            if ($videoEmitEventCheckbox.prop('checked')) {
                sandbox.initiateVideoTimeEvent(playerTime);
            }

            console.log('Condition: ' + ($videoLoopOnViewCheckbox.prop('checked')) + ' && ' + (playerTime > sandbox.focusState.endTime));
            if (playerTime > sandbox.focusState.endTime) {
                endOfFocusReached();
            }
        }

        function displayVideos(err, annotatedVideos) {
            sandbox.requestTemplate('embeddedvideo', function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {

                    _.each(eventTypes, function(type) {
                        if (type.name === 'Wave') {
                            type.selected = 'selected';
                        } else {
                            type.selected = '';
                        }
                    });

                    videoList = _.sortBy(annotatedVideos, function(video) {
                        return video.startTime;
                    });

                    var parameters = {
                        videos: videoList,
                        eventTypes: eventTypes
                    };
                    tile.place.html(template(parameters));
                    $videoSyncCheckbox = tile.place.find('[data-name=syncvideowithhovercheckbox]');
                    $videoEmitEventCheckbox = tile.place.find('[data-name=emitvideotimeeventscheckbox]');
                    $videoSpeedSelect = tile.place.find('[data-name=playbackspeedselect]');
                    $videoLoopOnViewCheckbox = tile.place.find('[data-name=looponviewcheckbox]');
                    $videoNextEventCheckbox = tile.place.find('[data-name=nexteventcheckbox]');
                    $videoNextEventSelect = tile.place.find('[data-name=nexteventselect]');
                    prepareListeners();

                    // We have to  test this now (instead of using loadVideoById
                    // later) because it takes a while for the player to set up,
                    // and it doesn't immediately have the loadVideoById function.
                    var currentVideoId;
                    if (videoList.length > 0) {
                        currentVideoIndex = 0;
                        currentVideoId = videoList[currentVideoIndex].hostId;
                    }

                    // We recreate a new player every time, since we have replaced
                    // all of the HTML
                    player = new YT.Player(
                            tile.place.find('[data-name=videoDiv]')[0],
                            {
                                height: '390',
                                width: '640',
                                videoId: currentVideoId,
                                playerVars: {
                                    html5: 1, // Force HTML5.
                                    modestbranding: 1, // Hide as much YouTube stuff as possible
                                    showinfo: 0, // Don't show extra info at video start
                                    //controls: 2, // Slight performance improvement.
                                    rel: 0 // Don't show related videos
                                            //TODO: Should specify the "origin" option to prevent cross origin security problems.
                                },
                                events: {
                                    onStateChange: onPlayerStateChange,
                                    onReady: onYTPlayerReady
                                }
                            }
                    );

                    // Hide if there's no videos
                    tile.setVisible(videoList.length !== 0);
                });
            });
        }

        function onYTPlayerReady() {
            // A little bit of a hack: the first seekTo
            // will cause an unstarted video to play.
            // So the trick is to play then pause the
            // video so that the first seekTo won't
            // cause the video to start playing.
            player.mute();
            player.playVideo();
            setTimeout(function() {
                player.pauseVideo();
                seekTo(sandbox.focusState.startTime);
            }, 500);
            //player.unMute();

            // Prepare the speed settings selector
            $videoSpeedSelect.find('option').remove();
            $.each(player.getAvailablePlaybackRates(), function(key, value) {
                var option = $('<option></option>')
                        .attr('value', value)
                        .text(value + 'x');
                if (value === 1) {
                    option.attr('selected', 'selected');
                }
                $videoSpeedSelect.append(option);
            });

        }

        function setVideos(videos) {
            async.map(videos, annotateVideoWithHostInformation, displayVideos);
        }

        function getVideoIndex(videoId) {
            return _.reduce(videoList, function(memo, value, index) {
                if (value.id === videoId) {
                    return index;
                } else {
                    return memo;
                }
            }, -1);
        }

        function deleteVideo(videoId) {
            sandbox.delete('video', videoId);
            videoList.splice(getVideoIndex(videoId), 1);
            var $video = tile.place.find('[data-videoid=' + videoId + ']')
                    .addClass('bg-danger').hide('slow', function() {
                $video.remove();
            });
        }

        function prepareListeners() {
            tile.place.find('[data-name=addvideobutton]').on('click', function() {
                var defaults = {
                    startTime: sandbox.focusState.startTime,
                    dataset: sandbox.getCurrentDataset()
                };
                sandbox.showModal('modifyresource', {
                    resourceAction: 'create',
                    resourceType: 'video',
                    resource: defaults
                });
            });

            tile.place.find('.long-list-wrapper')
                    .on('click', '[data-name=videofocus]', function() {
                        var videoId = $(this).parents('[data-videoid]').data('videoid');
                        currentVideoIndex = getVideoIndex(videoId);
                        sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDataset(), videoList[currentVideoIndex].startTime, videoList[currentVideoIndex].endTime);
                        player.loadVideoById(videoList[currentVideoIndex].hostId);
                    })
                    .on('click', '[data-name=deletevideobutton]', function() {
                        var $video = $(this).parent();
                        var videoId = $video.data('videoid');

                        deleteVideo(videoId);

                    })
                    .on('click', '[data-name=videoedit]', function() {
                        var videoId = $(this).data('id');
                        sandbox.displayEditResourceDialog('video', videoId);
                    });
            $videoSpeedSelect.change(function(e) {
                player.setPlaybackRate($(this).find('option:selected').val());
            });

        }

        function resourceFocused(event, parameter) {
            var newDatasetId = '';
            if (parameter.type === 'dataset') {
                newDatasetId = sandbox.getCurrentDataset();
            } else if (parameter.type === 'event') {
                newDatasetId = sandbox.focusState.event.datasetId;
            }

            // Only update video list when there's a new dataset.
            if (typeof datasetId === 'undefined'
                    || datasetId !== newDatasetId) {
                reset();
                datasetId = newDatasetId;
                sandbox.get('video', {dataset: datasetId}, setVideos);
            } else { // At least seek the video to match the current time...
                seekTo(sandbox.focusState.startTime);
            }
        }

        function seekTo(milliseconds) {
            console.log('Seeking to ' + milliseconds);
            if (currentVideoIndex !== -1) {
                // seekTo is in seconds, not milliseconds
                var videoTime = (milliseconds - videoList[currentVideoIndex].startTime) / 1000;
                if (videoTime < 0) {
                    videoTime = 0;
                }
                player.seekTo(videoTime, true);
                if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                    showPlayerTime(); // Force showing when we're not playing.
                }
            }
        }

        function hoverTime(event, parameters) {
            if (typeof $videoSyncCheckbox !== 'undefined'
                    && $videoSyncCheckbox.prop('checked')) {
                seekTo(parameters.hoverTime);
            }
        }

        function destructor() {
            reset();
            player.destroy();
            youtubeApiKey
                    = kPlayerUpdateInterval
                    = sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = videoList
                    = playerTimePlace
                    = currentVideoIndex
                    = player
                    = showPlayerTimeTimeout
                    = datasetId
                    = $videoSyncCheckbox
                    = $videoEmitEventCheckbox
                    = $videoSpeedSelect
                    = $videoLoopOnViewCheckbox
                    = $videoNextEventCheckbox
                    = null;
        }

        init();
        return {
            destructor: destructor
        };

    }
    return embeddedVideo;
});