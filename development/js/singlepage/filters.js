'use strict';

/* Filters */

angular.module('redApp.filters', [])
        .filter('duration', function() {
            return function(totalMilliseconds) {
                // adapted from here: http://stackoverflow.com/a/6313008/2557842
                var totalSeconds = Math.floor(totalMilliseconds / 1000);
                var hours = Math.floor(totalSeconds / 3600);
                var minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
                var seconds = totalSeconds - (hours * 3600) - (minutes * 60);
                var milliseconds = totalMilliseconds - totalSeconds * 1000;

                if (minutes < 10) {
                    minutes = "0" + minutes;
                }
                if (seconds < 10) {
                    seconds = "0" + seconds;
                }
                if (milliseconds < 10) {
                    milliseconds = '00' + milliseconds;
                } else if (milliseconds < 100) {
                    milliseconds = '0' + milliseconds;
                }

                var time = hours + 'h ' + minutes + 'm ' + seconds + '.' + milliseconds + 's';
                return time;
            };
        })
        .filter('slice', function() {
            // Taken from here: http://jsfiddle.net/BinaryMuse/vQUsS/
            return function(arr, start, end) {
                return arr.slice(start, end);
            };
        });
        