(function () {
    'use strict';

    /* Filters */

    angular.module('redApp.filters', [])
        .filter('duration', function (_) {
            return function (totalMilliseconds, tight) {
                if (_.isNaN(totalMilliseconds)) {
                    totalMilliseconds = 0;
                }

                if (typeof tight === 'undefined') {
                    tight = false;
                }

                // adapted from here: http://stackoverflow.com/a/6313008/2557842
                var totalSeconds = Math.floor(totalMilliseconds / 1000);
                var hours = Math.floor(totalSeconds / 3600);
                var minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
                var seconds = totalSeconds - (hours * 3600) - (minutes * 60);
                var milliseconds = Math.floor(totalMilliseconds - totalSeconds * 1000);

                var minutesString = '' + minutes;
                if (minutes < 10) {
                    minutesString = '0' + minutes;
                }
                var secondsString = '' + seconds;
                if (seconds < 10) {
                    secondsString = '0' + seconds;
                }

                var millisecondsString = '' + milliseconds;
                if (milliseconds < 10) {
                    millisecondsString = '00' + milliseconds;
                } else if (milliseconds < 100) {
                    millisecondsString = '0' + milliseconds;
                }


                if (tight === false || hours > 0) {
                    return hours + 'h ' + minutesString + 'm ' + secondsString + '.' + millisecondsString + 's';
                } else if (minutes > 0) {
                    return minutes + 'm ' + secondsString + '.' + millisecondsString + 's';
                } else {
                    return seconds + '.' + millisecondsString + 's';
                }

            };
        }).
        filter('slice', function () {
            // Taken from here: http://jsfiddle.net/BinaryMuse/vQUsS/
            return function (arr, start, end) {
                return arr.slice(start, end);
            };
        });
})();