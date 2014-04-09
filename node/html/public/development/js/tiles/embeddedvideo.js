define(['vendor/jquery', 'vendor/underscore', 'vendor/async', 'sandbox', 'customHandlebarsHelpers'], function($, _, async, sandbox, chh) {
    // Class variables
    var youtubeApiKey = "AIzaSyBhSTRxw9EXWgZiMCqIYdPKtZuDdaXkCdA";

    function embeddedVideo(myPlace, configuration, doneCallback) {

        var videoList;
        var playerTimePlace;
        var currentVideoIndex;
        var player;
        var showPlayerTimeTimeout;
        var datasetId;

        function reset() {
            videoList = [];
            playerTimePlace = undefined;
            currentVideoIndex = -1;
            player = undefined;
            if (typeof showPlayerTimeTimeout !== 'undefined') {
                clearInterval(showPlayerTimeTimeout);
            }
            datasetId = undefined;
        }

        function annotateVideoWithHostInformation(video, callback) {
            // Get the YouTube video information.
            $.ajax({
                type: 'GET',
                url: "https://www.googleapis.com/youtube/v3/videos?id="
                        + video.hostId +
                        "&part=snippet,contentDetails,recordingDetails&key=" + youtubeApiKey,
                dataType: 'json',
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
                    showPlayerTimeTimeout = setInterval(showPlayerTime, 250);
                }
            } else if (event.data === YT.PlayerState.ENDED
                    || event.data === YT.PlayerState.PAUSED
                    || event.data === YT.PlayerState.BUFFERING) {
                if (typeof showPlayerTimeTimeout !== 'undefined') {
                    console.log('Clearing timeout');
                    clearInterval(showPlayerTimeTimeout);
                    showPlayerTimeTimeout = undefined;
                }
            }
        }

        function showPlayerTime() {
            if (typeof playerTimePlace === 'undefined') {
                playerTimePlace = myPlace.find('[data-name=currentvideotime]')
            }

            var playerTime = videoList[currentVideoIndex].startTime + player.getCurrentTime() * 1000;
            //console.log('Player Time: ' + playerTime);
            playerTimePlace.text(chh.MillisecondsEpochToTime(playerTime) + ' (' + playerTime + ')');
        }

        function displayVideos(err, annotatedVideos) {
            sandbox.requestTemplate('embeddedvideo', function(template) {

                videoList = _.sortBy(annotatedVideos, function(video) {
                    return video.startTime;
                });

                var parameters = {
                    videos: videoList
                };
                myPlace.html(template(parameters));
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
                        myPlace.find('[data-name=videoDiv]')[0],
                        {
                            height: '390',
                            width: '640',
                            videoId: currentVideoId,
                            playerVars:{
                              modestbranding:1,
                              showinfo:0,
                              controls:1
                            },
                            events: {
                                onStateChange: onPlayerStateChange
                            }
                        }
                );

                
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
            var $video = myPlace.find('[data-videoid=' + videoId + ']')
                    .addClass('bg-danger').hide('slow', function() {
                $video.remove();
            });
        }

        function prepareListeners() {
            myPlace.find('[data-name=addvideobutton]').on('click', function() {
                var defaults = {
                    startTime: sandbox.focusState.startTime,
                    dataset: sandbox.focusState.dataset
                };
                sandbox.createResourceDisplay('video', defaults);
            });

            myPlace.find('.long-list-wrapper')
                    .on('click', '[data-name=videofocus]', function() {
                        var videoId = $(this).parents('[data-videoid]').data('videoid');
                        console.log('Video Id: ' + videoId);
                        currentVideoIndex = getVideoIndex(videoId);
                        console.log('currentVideoIndex: ' + currentVideoIndex);
                        sandbox.resourceFocused('dataset', sandbox.focusState.dataset, videoList[currentVideoIndex].startTime, videoList[currentVideoIndex].endTime);
                        player.loadVideoById(videoList[currentVideoIndex].hostId);
                    })
                    .on('click', '[data-name=deletevideobutton]', function() {
                        var $video = $(this).parent();
                        var videoId = $video.data('videoid');

                        deleteVideo(videoId);


                    })
                    .on('click', '[data-name=videoedit]', function() {
                        var videoId = $(this).data('id');

                        sandbox.editResourceDisplay('video', videoId);
                    });
        }



        function resourceFocused(event, parameters) {
            var newDatasetId = '';
            if (parameters.type === 'dataset') {
                newDatasetId = parameters.resource.id;
            } else if (parameters.type === 'event') {
                newDatasetId = parameters.resource.datasetId;
            }

            // Only update video list when there's a new dataset.
            if (typeof datasetId === 'undefined'
                    || datasetId !== newDatasetId) {
                reset();
                datasetId = newDatasetId;
                sandbox.get('video', {dataset: datasetId}, setVideos);
            }
        }
        
        function hoverTime(event, parameters) {
            
            if(currentVideoIndex !== -1){
                console.log(parameters.hovertime);
                
                var videoTime = parameters.hovertime - videoList[currentVideoIndex].startTime;
                if(videoTime > 0){
                    player.seekTo(videoTime / 1000, true); // seekTo is in seconds, not milliseconds
                    showPlayerTime();
                }
                
            }
            //typeof showPlayerTimeTimeout === 'undefined'
        }

        reset();
        $(sandbox).on('totalState.resource-focused', resourceFocused);
        $(sandbox).on('totalState.hover-time', hoverTime);
        setVideos(videoList);
        doneCallback();
    }
    return embeddedVideo;



});