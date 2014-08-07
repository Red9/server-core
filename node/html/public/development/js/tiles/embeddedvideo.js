define(['vendor/jquery', 'vendor/underscore', 'vendor/async', 'customHandlebarsHelpers'], function($, _, async, chh) {
    // Class variables
    var youtubeApiKey = "AIzaSyBhSTRxw9EXWgZiMCqIYdPKtZuDdaXkCdA";
    var kPlayerUpdateInterval = 250;
    var kHoverUpdateMinimum = 1000;

    function embeddedVideo(sandbox, tile, configuration, doneCallback) {

        var videoList; // sorted by start time.
        var playerTimePlace;
        var deltaTimePlace
        var currentVideo;
        var player;
        var playerReady;
        var showPlayerTimeTimeout;
        var datasetId;
        var $playerIdPlace;
        var $videoSyncCheckbox;
        var $videoSpeedSelect;
        var $videoLoopOnViewCheckbox;
        var $videoNextEventCheckbox;
        var $videoNextEventSelect;
        var lastHoverSync;
        var lastHoverTime;

        function init() {
            reset();
            setupTile();
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.addListener('totalState-hover-time', hoverTime);
            tile.setTitle('videos');
            doneCallback();
        }

        function reset() {
            videoList = [];

            if (typeof showPlayerTimeTimeout !== 'undefined') {
                clearInterval(showPlayerTimeTimeout);
            }

            lastHoverSync = (new Date()).getTime();

            player
                    = currentVideo
                    = playerTimePlace
                    = deltaTimePlace
                    = showPlayerTimeTimeout
                    = datasetId
                    = $playerIdPlace
                    = $videoSyncCheckbox
                    = $videoSpeedSelect
                    = $videoLoopOnViewCheckbox
                    = $videoNextEventCheckbox
                    = $videoNextEventSelect
                    = lastHoverTime
                    = undefined;
        }

        function setupTile() {
            sandbox.requestTemplate('embeddedvideo', function(template) {
                sandbox.get('eventtype', {}, function(eventTypes) {

                    _.each(eventTypes, function(type) {
                        if (type.name === 'Wave') {
                            type.selected = 'selected';
                        } else {
                            type.selected = '';
                        }
                    });

                    var parameters = {
                        eventTypes: eventTypes
                    };

                    tile.place.html(template(parameters));
                    $playerIdPlace = tile.place.find('[data-name=currentvideoid]');
                    $videoSyncCheckbox = tile.place.find('[data-name=syncvideowithhovercheckbox]');
                    $videoSpeedSelect = tile.place.find('[data-name=playbackspeedselect]');
                    $videoLoopOnViewCheckbox = tile.place.find('[data-name=looponviewcheckbox]');
                    $videoNextEventCheckbox = tile.place.find('[data-name=nexteventcheckbox]');
                    $videoNextEventSelect = tile.place.find('[data-name=nexteventselect]');

                    prepareListeners();

                    player = new YT.Player(
                            tile.place.find('[data-name=videoDiv]')[0],
                            {
                                height: '390',
                                width: '640',
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
                                    onError: function(event) {
                                        var message = 'YouTube player error: ' + event.data;
                                        console.log(message);
                                        alert(message);
                                    },
                                    onReady: function() {
                                        playerReady = true;

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

                                        // We may already know what videos we
                                        // have, in which case onReady is
                                        // responsible for initiating the show.
                                        if (videoList.length !== 0) {
                                            console.log('onReady');
                                            displayVideos();
                                        }
                                    }
                                }
                            }
                    );
                });
            });
        }

        function setVideos(videos) {
            async.map(videos, annotateVideoWithHostInformation,
                    function(err, annotatedVideos) {
                        videoList = _.sortBy(annotatedVideos, function(video) {
                            return video.startTime;
                        });

                        sandbox.requestTemplate('embeddedvideo.listitem', function(template) {
                            tile.place.find('.long-list-wrapper').html(template({videoList: videoList}));
                        });


                        displayVideos();
                    });
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

                    //console.log('Data: ' + JSON.stringify(data, null, ' '));
                    // YouTube duration is in the format "PT13M34S"
                    // Let's convert it to our standard milliseconds
                    if (data.pageInfo.totalResults === 1) {
                        var videoDuration = data.items[0].contentDetails.duration.match(/[0-9]+/g);
                        videoDuration = (parseInt(videoDuration[0]) * 60 + parseInt(videoDuration[1])) * 1000;

                        video.title = data.items[0].snippet.title;
                        video.description = sandbox.truncateStringAtWord(data.items[0].snippet.description, 45);
                        video.thumbnails = data.items[0].snippet.thumbnails;
                        video.duration = videoDuration;

                        // Create an artificial end time.
                        video.endTime = video.startTime + video.duration;
                    } else {
                        video.private = true;
                    }
                    callback(null, video);
                },
                error: function() {
                    callback(null, video);
                }

            });
        }

        function displayVideos() {
            if (videoList.length === 0) {
                // Hide if there's no videos
                tile.setVisible(videoList.length !== 0);
            } else {
                seekTo(sandbox.focusState.startTime);
            }
        }

        function seekTo(milliseconds) {
            var v = mapTimeToVideo(milliseconds);
            if (playerReady !== true) {
                // Do nothing. We don't have a player (yet?).
            } else if (typeof v !== 'undefined') {
                // seekTo is in seconds, not milliseconds

                // Go ahead and calculate here, for convenience.
                var videoTime = calculateVideoTime(v.startTime, milliseconds);

                if (typeof currentVideo === 'undefined'
                        || v.id !== currentVideo.id) {
                    // We need to load in a new video
                    currentVideo = v;
                    var previousPlayerState = player.getPlayerState();
                    console.log('SEEK: Player state: ' + previousPlayerState);
                    loadVideo(currentVideo.hostId, videoTime, function() {
                        if (previousPlayerState === YT.PlayerState.PLAYING) {
                            player.playVideo();
                        } else { // if it wasn't playing, then we don't care. We'll pause it.
                            player.pauseVideo();
                        }

                        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                            updateDashboardDisplay(); // Force showing when we're not playing.
                        }
                    });
                } else {
                    // The correct video is loaded, we just need to seek.
                    player.seekTo(videoTime, true);
                    if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                        updateDashboardDisplay(); // Force showing when we're not playing.
                    }
                }
            } else { // no video at current time
                // TODO: clear what's currently playing.
            }

        }

        function calculateVideoTime(videoStartTime, time) {
            var videoTime = (time - videoStartTime) / 1000;
            if (videoTime < 0) {
                console.log('videoTime < 0!');
                videoTime = 0;
            }
            return videoTime;
        }

        function mapTimeToVideo(time) {
            // videoList is sorted by time.
            // Slice to make a copy (reverse is in place).
            // If videos overlap, we want the first video to end early in order
            // for the second to begin. That's what the reverse does.
            return _.find(videoList.slice().reverse(), function(video, index) {
                return (video.startTime <= time
                        && time <= video.endTime
                        && video.private !== true)
                        // If the given time is before the first video we'll go
                        // ahead and map it to that video. This solves the
                        // problem of loading a dataset, and having a video
                        // loaded.
                        || index === videoList.length - 1;

            });
        }

        function loadVideo(hostId, startTime, callback) {
            player.loadVideoById({
                videoId: hostId,
                startSeconds: startTime
            });

            player.mute();
            callback();

        }

        function onPlayerStateChange(event) {
            //console.log('Player state: ' + event.data);
            if (event.data === YT.PlayerState.PLAYING) {
                if (typeof showPlayerTimeTimeout === 'undefined') {
                    showPlayerTimeTimeout = setInterval(monitorPlayingVideo, kPlayerUpdateInterval);
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

        function seekToNextEvent() {
            player.pauseVideo();
            sandbox.get('event', {datasetId: sandbox.getCurrentDatasetId()},
            function(eventList) {
                // Get the event type to seek to
                var eventType = $videoNextEventSelect.find('option:selected').val();

                // Extract the next event from the event list.
                var nextEvent = _.find(_.sortBy(_.filter(eventList, function(event) {
                    return event.type === eventType; // Limit to the selected event type
                }), function(event) {
                    return event.startTime;         // Sort by start time
                }), function(event) {
                    // And get the first one whose start time follows the RHS of the window
                    return event.startTime >= sandbox.focusState.endTime;
                });

                if (typeof nextEvent !== 'undefined') {
                    sandbox.initiateResourceFocusedEvent('event', nextEvent.id);
                    player.playVideo();
                }
            });
        }

        function endOfFocusReached() {
            if ($videoLoopOnViewCheckbox.prop('checked')) {
                seekTo(sandbox.focusState.startTime);
            } else if ($videoNextEventCheckbox.prop('checked')) {
                seekToNextEvent();
            }
        }

        function monitorPlayingVideo() {
            var playerTime = updateDashboardDisplay();
            if (playerTime > sandbox.focusState.endTime) {
                endOfFocusReached();
            }
        }

        function updateDashboardDisplay() {
            if (typeof playerTimePlace === 'undefined') {
                playerTimePlace = tile.place.find('[data-name=currentvideotime]');
            }

            if (typeof deltaTimePlace === 'undefined') {
                deltaTimePlace = tile.place.find('[data-name=videohoverdelta]');
            }

            var playerTime = currentVideo.startTime + player.getCurrentTime() * 1000;
            //console.log('Player Time: ' + playerTime);
            playerTimePlace.text(chh.millisecondsEpochToTime(playerTime) + ' (' + Math.floor(playerTime) + ')');

            var deltaTime = hoverTime - playerTime;

            deltaTimePlace.text(Math.floor(deltaTime));

            if (typeof currentVideo === 'undefined') {
                $playerIdPlace.text('undefined');
            } else {
                $playerIdPlace.text(currentVideo.hostId);
            }

            // Always update sandbox with current video time.
            if (_.isNaN(playerTime) === false) { // TODO: Temporary, listeners should take of this...
                sandbox.initiateVideoTimeEvent(playerTime);
            }

            return playerTime;
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

        function prepareListeners() {
            tile.addToBar("addVideo", "", "glyphicon-plus", function() {
                var defaults = {
                    startTime: sandbox.focusState.startTime,
                    dataset: sandbox.getCurrentDatasetId()
                };
                sandbox.showModal('modifyresource', {
                    resourceAction: 'create',
                    resourceType: 'video',
                    resource: defaults
                });
            });

            tile.place.find('.long-list-wrapper')
                    .on('click', '[data-name=deletevideobutton]', function() {
                        var videoId = $(this).data('id');
                        sandbox.delete('video', videoId);
                        videoList.splice(getVideoIndex(videoId), 1);

                        // We'll leave currentVideo untouched. If the user
                        // deletes a video while it's being played then it will
                        // just keep playing until they zoom around, at which
                        // point it disappears. This is the simplest solution.


                        $(this).parent().parent().addClass('bg-danger').hide('slow', function() {
                            $(this).remove(); // this is parent
                        });

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
                newDatasetId = sandbox.getCurrentDatasetId();
            } else if (parameter.type === 'event') {
                newDatasetId = sandbox.focusState.event.datasetId;
            }

            // Only update video list when there's a new dataset.
            if (typeof datasetId === 'undefined'
                    || datasetId !== newDatasetId) {
                datasetId = newDatasetId;
                sandbox.get('video', {dataset: datasetId}, setVideos);
            } else { // Otherwise, default to seeking the video to the current time.
                seekTo(sandbox.focusState.startTime);
            }
        }

        function hoverTime(event, parameters) {
            hoverTime = parameters.hoverTime;
            updateDashboardDisplay();
            if (typeof $videoSyncCheckbox !== 'undefined'
                    && $videoSyncCheckbox.prop('checked')) {

                // Prevent a stream of hover updates from thrashing the YouTube
                // video.
                var currentTime = (new Date()).getTime();
                if ((currentTime - lastHoverSync) > kHoverUpdateMinimum) {
                    lastHoverSync = currentTime;
                    seekTo(parameters.hoverTime);
                }
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
                    = playerReady
                    = player
                    = showPlayerTimeTimeout
                    = datasetId
                    = $playerIdPlace
                    = $videoSyncCheckbox
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