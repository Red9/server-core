function embeddedVideo(myPlace, configuration, doneCallback) {

    this.youtubeApiKey = "AIzaSyBhSTRxw9EXWgZiMCqIYdPKtZuDdaXkCdA";

    this.myPlace = myPlace;
    $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));

    this.setVideos([]);

    doneCallback();
}



embeddedVideo.prototype.setVideos = function(videos) {
    var self = this;
    sandbox.requestTemplate('embeddedvideo', function(template) {

        if (videos.length > 0) {


            async.map(videos, function(video, callback) {
                $.ajax({
                    type: 'GET',
                    url: "https://www.googleapis.com/youtube/v3/videos?id="
                            + video.hostId +
                            "&part=snippet,contentDetails,recordingDetails&key=" + self.youtubeApiKey,
                    dataType: 'json',
                    success: function(data) {


                        // YouTube duration is in the format "PT13M34S"
                        var videoDuration = data.items[0].contentDetails.duration.match(/[0-9]+/g);
                        videoDuration = (parseInt(videoDuration[0]) * 60 + parseInt(videoDuration[1])) * 1000;
                        console.log('Duration: ' + videoDuration);

                        video.title = data.items[0].snippet.title;
                        video.description = data.items[0].snippet.description;
                        video.thumbnails = data.items[0].snippet.thumbnails;
                        video.duration = videoDuration;

                        callback(null, video);
                    },
                    error: function() {
                        callback(null, video);
                    }

                });
            }, function(err, annotatedVideos) {

                //console.log('Videos: ' + JSON.stringify(annotatedVideos));

                annotatedVideos.push(annotatedVideos[0]);
                
                
                
                
                var parameters = {
                    videos: _.sortBy(annotatedVideos, function(video){ return video.startTime;})
                };

                self.myPlace.html(template(parameters));

                var onPlayerReady = function(event) {
                    //event.target.playVideo();
                };


                var showPlayerTime = function() {
                    console.log('Player Time: ' + (annotatedVideos[0].startTime + player.getCurrentTime() * 1000));
                };

                var showPlayerTimeTimeout;

                var onPlayerStateChange = function(event) {
                    if (event.data === YT.PlayerState.PLAYING) {
                        if (typeof showPlayerTimeTimeout === 'undefined') {
                            showPlayerTimeTimeout = setInterval(showPlayerTime, 500);
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
                };

                var stopVideo = function() {
                    player.stopVideo();
                };


                var player;
                if (annotatedVideos.length > 0) {
                    player = new YT.Player(
                            self.myPlace.find('[data-name=videoDiv]')[0],
                            {
                                height: '390',
                                width: '640',
                                videoId: annotatedVideos[0].hostId,
                                events: {
                                    'onReady': onPlayerReady,
                                    'onStateChange': onPlayerStateChange
                                }
                            }
                    );

                }
            });
        } else {
            self.myPlace.html(template({}));
        }

    });
};


embeddedVideo.prototype.resourceFocused = function(event, parameters) {
    var newDatasetId = '';
    if (parameters.type === 'dataset') {
        newDatasetId = parameters.resource.id;
    } else if (parameters.type === 'event') {
        newDatasetId = parameters.resource.datasetId;
    }

    if (typeof this.datasetId === 'undefined'
            || this.datasetId !== newDatasetId) {
        this.datasetId = newDatasetId;
        sandbox.get('video', {dataset: this.datasetId}, $.proxy(this.setVideos, this));
    }
};

