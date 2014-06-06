(function(undefined) {
    // check for nodeJS
    var hasModule = (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined');

    // CommonJS module is defined
    if (hasModule) {
        exports.RegisterHelpers = customHandlebarsHelpers;
    } else if (typeof define === 'function' && define.amd) {
        define(['vendor/handlebars', 'vendor/moment'], function(Handlebars, moment) {
            return customHandlebarsHelpers(Handlebars, moment);
        });
    } else {
        //makeGlobal();
    }

    function customHandlebarsHelpers(Handlebars, moment) {
        function padNumber(n, width, z) {
            z = z || '0';
            n = n + '';
            return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
        }
        function formatDuration(startTime, endTime) {
            if (typeof startTime === 'undefined' || typeof endTime === 'undefined') {
                return '0.000s';
            }
            var duration = endTime - startTime;

            var second = 1000;
            var minute = 60 * second;
            var hour = 60 * minute;
            var day = 24 * hour;
            if (duration > day) {
                return '!*!';
            } else if (duration > hour) {
                return moment(endTime - startTime).format('H:mm:ss.SSS');
            } else if (duration > minute) {
                return moment(endTime - startTime).format('m:ss.SSS');
            } else {
                return moment(endTime - startTime).format('s.SSS');
            }
        }
        function numberToDecimal(number) {
            if (typeof number === 'undefined') {
                return '';
            }
            if (Math.abs(number) > 9999 || Math.abs(number) < 0.01) {
                return number.toExponential(2);
            } else {
                return parseFloat(Math.round(number * 100) / 100).toFixed(2);
            }
        }
        function informalDateTime(milliseconds) {
            return moment(time).fromNow();
        }
        function date(milliseconds) {
            return moment(milliseconds).format('YYYY-MM-DD');
        }
        function time(milliseconds, precise) {
            if (precise === "precise") {
                return moment(milliseconds).format('h:mm:ss.SSS a');
            } else {
                return moment(milliseconds).format('h:mm a');
            }
        }

        function millisecondsEpochToTime(milliseconds) {
            if (typeof milliseconds === 'undefined') {
                return 'unknown';
            } else {
                return moment.utc(milliseconds).format('h:mm:ss.SSS a');
            }
        }
        function millisecondsEpochToDate(milliseconds) {
            if (typeof milliseconds === 'undefined') {
                return 'unknown';
            } else {
                return moment.utc(milliseconds).format('YYYY-MM-DD');
            }
        }
        function unitize(value, units) {
            if (units === 'date') {
                return  millisecondsEpochToDate(value)
                        + millisecondsEpochToTime(value);
            } else if (units === 'ms') {
                return formatDuration(0, value);
            } else if (typeof units === 'undefined') {
                return numberToDecimal(value);
            } else {
                return numberToDecimal(value);
            }
        }
        function percentFormater(numerator, denominator) {
            console.log('numerator: ' + numerator + ', denominator: ' + denominator);
            if (isNaN(numerator) && isNaN(denominator)) {
                return '---';
            } else if (isNaN(numerator)) {
                return '0%';
            } else if (isNaN(denominator)) {
                return '100%';
            } else {
                return (numberToDecimal(numerator / (numerator + denominator)) * 100) + '%';
            }
        }
        function bytesToHumanSize(bytes) {
            bytes = parseInt(bytes);
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) {
                return '0 Bytes';
            }
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        }
        function timeFromNow(time) {
            return moment(time).fromNow();
        }

        function starsHelper(n, max) {

            var star = '<span class="glyphicon glyphicon-star"></span>';
            var noStar = '<span class="glyphicon glyphicon-star-empty"></span>';

            var result = '';

            var i;

            if (typeof n !== 'undefined') {
                for (i = 0; i < n; i++) {
                    result += star;
                }
            }

            if (typeof max !== 'undefined') {
                for (; i < max; i++) {
                    result += noStar;
                }
            }

            return result;
        }

        Handlebars.registerHelper('date', date);
        Handlebars.registerHelper('time', time);
        Handlebars.registerHelper('informalDateTime', informalDateTime);
        Handlebars.registerHelper('decimal', numberToDecimal);
        Handlebars.registerHelper('epochtime', millisecondsEpochToTime);
        Handlebars.registerHelper('epochdate', millisecondsEpochToDate);
        Handlebars.registerHelper('unitize', unitize);
        Handlebars.registerHelper('percent', percentFormater);
        Handlebars.registerHelper('duration', formatDuration);
        Handlebars.registerHelper('bytesToHumanSize', bytesToHumanSize);
        Handlebars.registerHelper('timeFromNow', timeFromNow);
        Handlebars.registerHelper('ratingStars', starsHelper);

        return {
            millisecondsEpochToTime: millisecondsEpochToTime
        };

    }
}).call(this);

