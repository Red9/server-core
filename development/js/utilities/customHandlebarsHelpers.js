var customHandlebarsHelpers = {
    padNumber: function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    },
    FormatDuration: function(startTime, endTime) {
        if (typeof startTime === 'undefined' || typeof endTime === 'undefined') {
            return 'unknown';
        }

        var result = '';

        var duration = moment.duration(endTime - startTime);

        if (duration.years() !== 0) {
            result = duration.years() + 'Y ' + duration.months() + 'M ' + duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.months() !== 0) {
            result = duration.months() + 'M ' + duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.days() !== 0) {
            result = duration.days() + 'D ' + duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.hours() !== 0) {
            result = duration.hours() + 'h ' + duration.minutes() + 'm ';
        } else if (duration.minutes() !== 0) {
            result = duration.minutes() + 'm ';
        }

        result += duration.seconds() + '.' + duration.milliseconds() + 's';

        return result;

    },
    NumberToDecimal: function(number) {
        if (typeof number === "undefined") {
            return "";
        }
        if (Math.abs(number) > 9999 || Math.abs(number) < 0.01) {
            return number.toExponential(2);
        } else {
            return parseFloat(Math.round(number * 100) / 100).toFixed(2);
        }
    },
    MillisecondsEpochToTime: function(milliseconds) {
        if (typeof milliseconds === 'undefined') {
            return 'unknown';
        } else {
            return moment.utc(milliseconds).format("h:mm:ss.SSS a");
        }
    },
    MillisecondsEpochToDate: function(milliseconds) {
        if (typeof milliseconds === 'undefined') {
            return 'unknown';
        } else {
            return moment.utc(milliseconds).format("YYYY-MM-DD");
        }
    },
    FormatUnits: function(units) {
        /*if(units === "m/s^2"){
         return new hbs.SafeString("<sup>m</sup>&frasl;<sub>s</sub><small>2</small>");
         }else if(units === "ft/s^2"){
         return new hbs.SafeString("<sup>ft</sup>&frasl;<sub>s</sub><small>2</small>");
         }*/

        return units;
    },
    Unitize: function(value, units) {
        if (units === "date") {
            return  customHandlebarsHelpers.MillisecondsEpochToDate(value) + customHandlebarsHelpers.MillisecondsEpochToTime(value);
        } else if (units === "ms") {
            return customHandlebarsHelpers.FormatDuration(0, value);
        } else if (typeof units === "undefined") {
            return customHandlebarsHelpers.NumberToDecimal(value);
        } else {
            return customHandlebarsHelpers.NumberToDecimal(value);
        }
    },
    PercentFormater: function(numerator, denominator) {
        if (isNaN(numerator) || isNaN(denominator)) {
            return "---";
        } else {
            return (customHandlebarsHelpers.NumberToDecimal(numerator / (numerator + denominator)) * 100) + "%";
        }
    },
    BytesToHumanSize: function bytesToSize(bytes) {
        bytes = parseInt(bytes);
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) {
            return '0 Bytes';
        }
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    },
    RegisterHelpers: function(hbs) {
        hbs.registerHelper('decimal', customHandlebarsHelpers.NumberToDecimal);
        hbs.registerHelper('epochtime', customHandlebarsHelpers.MillisecondsEpochToTime);
        hbs.registerHelper('epochdate', customHandlebarsHelpers.MillisecondsEpochToDate);
        hbs.registerHelper('unitize', customHandlebarsHelpers.Unitize);
        hbs.registerHelper('formatunits', customHandlebarsHelpers.FormatUnits);
        hbs.registerHelper('percent', customHandlebarsHelpers.PercentFormater);
        hbs.registerHelper('duration', customHandlebarsHelpers.FormatDuration);
        hbs.registerHelper('bytesToHumanSize', customHandlebarsHelpers.BytesToHumanSize);
    }
};

if (typeof exports !== 'undefined') {
    // Running in Node.js
    exports.RegisterHelpers = customHandlebarsHelpers.RegisterHelpers;
    moment = require('moment');
} else {
    // Running in client
    customHandlebarsHelpers.RegisterHelpers(Handlebars);
}