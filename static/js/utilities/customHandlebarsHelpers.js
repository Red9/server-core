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
                return moment(new Date(endTime - startTime)).utc().format('H[h ]mm[m ]ss.SSS[s]');
            } else if (duration > minute) {
                return moment(endTime - startTime).utc().format('m[m ]ss.SSS[s]');
            } else {
                return moment(endTime - startTime).utc().format('s.SSS[s]');
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
            return moment(milliseconds).fromNow();
        }
        function date(milliseconds) {
            if (!milliseconds) {
                return '';
            }
            var givenDate = new Date(milliseconds);
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var yesterday = new Date();
            yesterday.setHours(0, 0, 0, 0);
            yesterday.setDate(today.getDate() - 1);
            if (givenDate > today) {
                return "Today";
            }
            else if (givenDate > yesterday) {
                return "Yesterday";
            }

            return moment(givenDate).format('YYYY-MM-DD');
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
                return numberToDecimal(value) + units;
            }
        }
        
        /* Pretty print a percentage number.
         * 
         * @param {type} numerator If no denominator specified then this should be 0 <= n <= 1
         * @param {type} denominator Optional.
         * @returns {String} A string that is in percent format.
         */
        function percentFormater(numerator, denominator) {
            if (isNaN(numerator) && isNaN(denominator)) {
                return '---';
            } else if (isNaN(numerator)) {
                return '0%';
            } else if (typeof denominator === 'undefined' || typeof denominator === 'object') { // Object because handlebars sends us information in subsequent parameters
                return Math.floor(numerator * 100) + '%';
            } else if (isNaN(denominator)) {
                return '100%';
            } else {
                return Math.floor((numerator / (numerator + denominator)) * 100) + '%';
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

        function truncateString(string, maxCharacters) {
            if (string.length >= maxCharacters) {
                string = string.substr(0, maxCharacters - 3) + '...';
            }
            return string;
        }

        /** Taken from http://doginthehat.com.au/2012/02/comparison-block-helper-for-handlebars-templates/
         * 
         * @param {type} lvalue
         * @param {type} operator
         * @param {type} rvalue
         * @param {type} options
         * @returns {unresolved}
         */
        function compare(lvalue, operator, rvalue, options) {

            var operators, result;

            if (arguments.length < 3) {
                throw new Error("Handlerbars Helper 'compare' needs 2 parameters");
            }

            if (typeof options === 'undefined') {
                options = rvalue;
                rvalue = operator;
                operator = "===";
            }

            operators = {
                '==': function(l, r) {
                    return l == r;
                },
                '===': function(l, r) {
                    return l === r;
                },
                '!=': function(l, r) {
                    return l != r;
                },
                '!==': function(l, r) {
                    return l !== r;
                },
                '<': function(l, r) {
                    return l < r;
                },
                '>': function(l, r) {
                    return l > r;
                },
                '<=': function(l, r) {
                    return l <= r;
                },
                '>=': function(l, r) {
                    return l >= r;
                },
                'typeof': function(l, r) {
                    return typeof l == r;
                }
            };

            if (!operators[operator]) {
                throw new Error("Handlerbars Helper 'compare' doesn't know the operator " + operator);
            }

            result = operators[operator](lvalue, rvalue);

            if (result) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }

        }

        // Taken from here
        // https://github.com/helpers/handlebars-helper-repeat/blob/master/index.js
        // Took out dependency on "digits".
        function repeat(n, options) {
            options = options || {};
            var _data = {};
            if (options._data) {
                _data = Handlebars.createFrame(options._data);
            }

            var content = '';
            var count = n - 1;
            for (var i = 0; i <= count; i++) {
                _data = {
                    index: i
                };
                content += options.fn(this, {data: _data});
            }
            return new Handlebars.SafeString(content);
        }

        Handlebars.registerHelper('date', date);
        Handlebars.registerHelper('time', time);
        Handlebars.registerHelper('informalDateTime', informalDateTime);
        Handlebars.registerHelper('decimal', numberToDecimal);
        Handlebars.registerHelper('unitize', unitize);
        Handlebars.registerHelper('percent', percentFormater);
        Handlebars.registerHelper('duration', formatDuration);
        Handlebars.registerHelper('bytesToHumanSize', bytesToHumanSize);
        Handlebars.registerHelper('ratingStars', starsHelper);
        Handlebars.registerHelper('truncate', truncateString);
        Handlebars.registerHelper('compare', compare);
        Handlebars.registerHelper('repeat', repeat);

        return {
            millisecondsEpochToTime: millisecondsEpochToTime
        };

    }
}).call(this);

